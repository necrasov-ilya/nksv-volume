import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';
import { normalizeFilename } from '../utils/filename.js';
import {
  loadMeta, saveMeta, addMeta, findMeta, removeMeta, deleteFolderRecursive,
} from '../utils/metaStore.js';

const router = Router();

function getStorageUsageBytes() {
  return fs.readdirSync(config.paths.uploads, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .reduce((total, entry) => {
      try {
        return total + fs.statSync(path.join(config.paths.uploads, entry.name)).size;
      } catch {
        return total;
      }
    }, 0);
}

function removeUploadedFiles(files = []) {
  for (const file of files) {
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
  }
}

const storage = multer.diskStorage({
  destination: config.paths.uploads,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, nanoid(12) + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (config.mimeWhitelist.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type: ' + file.mimetype));
  },
});

router.post('/upload', authMiddleware, upload.array('files', config.maxFilesPerUpload), (req, res) => {
  const folderId = req.body.folderId || null;
  if (folderId) {
    const parent = findMeta(folderId);
    if (!parent || parent.type !== 'folder') {
      removeUploadedFiles(req.files);
      return res.status(400).json({ error: 'Папка не найдена' });
    }
  }

  const storageLimitBytes = config.maxStorageGb * 1024 ** 3;
  if (getStorageUsageBytes() > storageLimitBytes) {
    removeUploadedFiles(req.files);
    return res.status(507).json({
      error: `Хранилище заполнено. Максимальный объём — ${config.maxStorageGb} ГБ`,
    });
  }

  const files = req.files.map((f) => {
    const entry = {
      id: nanoid(10),
      type: 'file',
      storedName: f.filename,
      originalName: normalizeFilename(f.originalname),
      mimeType: f.mimetype,
      size: f.size,
      folderId,
      uploadedAt: new Date().toISOString(),
    };
    addMeta(entry);
    return entry;
  });
  res.json({ files });
});

router.post('/folders', authMiddleware, (req, res) => {
  const { name, folderId = null } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Folder name required' });
  if (name.trim().length > 120) return res.status(400).json({ error: 'Folder name is too long' });
  if (folderId) {
    const parent = findMeta(folderId);
    if (!parent || parent.type !== 'folder') {
      return res.status(400).json({ error: 'Parent folder not found' });
    }
  }
  const entry = {
    id: nanoid(10),
    type: 'folder',
    name: name.trim(),
    folderId,
    createdAt: new Date().toISOString(),
  };
  addMeta(entry);
  res.json({ folder: entry });
});

router.get('/folders', authMiddleware, (_req, res) => {
  const meta = loadMeta();
  const folders = meta
    .filter((entry) => entry.type === 'folder')
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      folderId: folder.folderId || null,
      path: buildFolderPath(meta, folder),
    }))
    .sort((a, b) => a.path.localeCompare(b.path, 'ru'));
  res.json({ folders });
});

router.patch('/folders/:id', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (name?.trim().length > 120) return res.status(400).json({ error: 'Folder name is too long' });
  const meta = loadMeta();
  const entry = meta.find((f) => f.id === req.params.id && f.type === 'folder');
  if (!entry) return res.status(404).json({ error: 'Folder not found' });
  entry.name = name?.trim() || entry.name;
  saveMeta(meta);
  res.json({ folder: entry });
});

router.get('/files', authMiddleware, (req, res) => {
  const folderId = req.query.folderId === 'null' ? null : (req.query.folderId || null);
  const meta = loadMeta();

  const folders = meta
    .filter((f) => f.type === 'folder' && (f.folderId || null) === folderId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((folder) => ({
      ...folder,
      itemCount: meta.filter((item) => (item.folderId || null) === folder.id).length,
    }));

  const files = meta
    .filter((f) => f.type !== 'folder' && (f.folderId || null) === folderId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const breadcrumbs = buildBreadcrumbs(meta, folderId);
  const storage = {
    usedBytes: getStorageUsageBytes(),
    limitBytes: config.maxStorageGb * 1024 ** 3,
  };

  res.json({ folders, files, breadcrumbs, storage });
});

function buildBreadcrumbs(meta, folderId) {
  const crumbs = [];
  let currentId = folderId;
  while (currentId) {
    const folder = meta.find((f) => f.id === currentId && f.type === 'folder');
    if (!folder) break;
    crumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.folderId;
  }
  return crumbs;
}

function buildFolderPath(meta, folder) {
  const names = [folder.name];
  const visited = new Set([folder.id]);
  let parentId = folder.folderId;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = meta.find((entry) => entry.id === parentId && entry.type === 'folder');
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.folderId;
  }
  return names.join(' / ');
}

router.patch('/files/:id', authMiddleware, (req, res) => {
  const meta = loadMeta();
  const entry = meta.find((item) => item.id === req.params.id && item.type !== 'folder');
  if (!entry) return res.status(404).json({ error: 'Файл не найден' });

  if (Object.prototype.hasOwnProperty.call(req.body, 'folderId')) {
    const targetFolderId = req.body.folderId || null;
    if (targetFolderId) {
      const target = meta.find((item) => item.id === targetFolderId && item.type === 'folder');
      if (!target) return res.status(400).json({ error: 'Папка назначения не найдена' });
    }
    entry.folderId = targetFolderId;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Имя файла не может быть пустым' });
    if (name.length > 255) return res.status(400).json({ error: 'Имя файла слишком длинное' });
    entry.originalName = name;
  }

  saveMeta(meta);
  return res.json({ file: entry });
});

router.delete('/files/:id', authMiddleware, (req, res) => {
  const entry = removeMeta(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  if (entry.storedName) {
    const filePath = path.join(config.paths.uploads, entry.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json({ ok: true });
});

router.delete('/folders/:id', authMiddleware, (req, res) => {
  const deleted = deleteFolderRecursive(req.params.id);
  if (!deleted.length) return res.status(404).json({ error: 'Folder not found' });
  for (const entry of deleted) {
    if (entry.storedName) {
      const filePath = path.join(config.paths.uploads, entry.storedName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
  res.json({ ok: true, deleted: deleted.length });
});

export default router;
