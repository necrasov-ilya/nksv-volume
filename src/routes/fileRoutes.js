import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  loadMeta, saveMeta, addMeta, findMeta, removeMeta, deleteFolderRecursive,
} from '../utils/metaStore.js';

const router = Router();

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
  const files = req.files.map((f) => {
    const entry = {
      id: nanoid(10),
      type: 'file',
      storedName: f.filename,
      originalName: f.originalname,
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

router.patch('/folders/:id', authMiddleware, (req, res) => {
  const { name } = req.body;
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
    .sort((a, b) => a.name.localeCompare(b.name));

  const files = meta
    .filter((f) => f.type !== 'folder' && (f.folderId || null) === folderId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const breadcrumbs = buildBreadcrumbs(meta, folderId);

  res.json({ folders, files, breadcrumbs });
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
