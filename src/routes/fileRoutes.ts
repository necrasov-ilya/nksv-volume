import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import { config } from '../config.js';
import { ERROR_MESSAGES } from '../constants/errors.js';
import {
  MAX_FILES_PER_UPLOAD,
  NANOID_FILE_NAME_LENGTH,
  NANOID_ID_LENGTH,
  UPLOAD_FIELD_NAME,
} from '../constants/limits.js';
import {
  FILES_ROUTE,
  FOLDERS_ROUTE,
  UPLOAD_ROUTE,
} from '../constants/routes.js';
import { authMiddleware } from '../middleware/auth.js';
import { normalizeFilename } from '../utils/filename.js';
import { buildBreadcrumbs, buildFolderPath } from '../utils/folderPath.js';
import {
  addMeta,
  deleteFolderRecursive,
  findMetaByType,
  loadMeta,
  removeMeta,
  saveMeta,
} from '../utils/metaStore.js';
import {
  deleteStoredFile,
  disposeDeletedEntries,
  getStorageUsageBytes,
  maxFileSizeBytes,
  removeUploadedFiles,
  storageLimitBytes,
} from '../utils/storage.js';
import { asyncHandler } from '../utils/routeHelpers.js';
import { deleteArticleContent } from '../utils/articleStore.js';
import {
  validateFileName,
  validateFolderName,
  findParentFolder,
} from '../validation/meta.js';
import type { ArticleEntry, FileEntry, FolderEntry } from '../types.js';

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: config.paths.uploads,
    filename: (_req, file, cb) => {
      cb(null, nanoid(NANOID_FILE_NAME_LENGTH) + path.extname(file.originalname).toLowerCase());
    },
  }),
  limits: { fileSize: maxFileSizeBytes() },
  fileFilter: (_req, file, cb) => {
    if (config.mimeWhitelist.includes(file.mimetype)) cb(null, true);
    else cb(new Error(ERROR_MESSAGES.unsupportedFileType(file.mimetype)));
  },
});

router.post(
  UPLOAD_ROUTE,
  authMiddleware,
  upload.array(UPLOAD_FIELD_NAME, MAX_FILES_PER_UPLOAD),
  (req, res) => {
    const folderId: string | null = req.body.folderId || null;
    const files = (req.files ?? []) as Express.Multer.File[];

    if (folderId && !findMetaByType<FolderEntry>(folderId, 'folder')) {
      removeUploadedFiles(files);
      return res.status(400).json({ error: ERROR_MESSAGES.folderNotFound });
    }

    if (getStorageUsageBytes() > storageLimitBytes()) {
      removeUploadedFiles(files);
      return res.status(507).json({ error: ERROR_MESSAGES.storageFull(config.maxStorageGb) });
    }

    const entries = files.map<FileEntry>((f) => {
      const entry: FileEntry = {
        id: nanoid(NANOID_ID_LENGTH),
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
    res.json({ files: entries });
  },
);

router.post(FOLDERS_ROUTE, authMiddleware, (req, res) => {
  const { name, folderId = null } = req.body as { name?: string; folderId?: string | null };
  const nameResult = validateFolderName(name);
  if (nameResult.error) return res.status(400).json({ error: nameResult.error });

  const parentResult = findParentFolder(folderId);
  if (folderId && !parentResult) {
    return res.status(400).json({ error: ERROR_MESSAGES.parentFolderNotFound });
  }

  const entry: FolderEntry = {
    id: nanoid(NANOID_ID_LENGTH),
    type: 'folder',
    name: nameResult.value!,
    folderId: folderId || null,
    createdAt: new Date().toISOString(),
  };
  addMeta(entry);
  res.json({ folder: entry });
});

router.get(FOLDERS_ROUTE, authMiddleware, (_req, res) => {
  const meta = loadMeta();
  const folders = meta
    .filter((entry): entry is FolderEntry => entry.type === 'folder')
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      folderId: folder.folderId || null,
      path: buildFolderPath(meta, folder),
    }))
    .sort((a, b) => a.path.localeCompare(b.path, 'ru'));
  res.json({ folders });
});

router.patch(`${FOLDERS_ROUTE}/:id`, authMiddleware, (req, res) => {
  if (req.body.name !== undefined) {
    const nameResult = validateFolderName(req.body.name);
    if (nameResult.error) return res.status(400).json({ error: nameResult.error });
  }

  const meta = loadMeta();
  const entry = findMetaByType<FolderEntry>(req.params.id, 'folder');
  if (!entry) return res.status(404).json({ error: ERROR_MESSAGES.notFound });
  if (req.body.name !== undefined) entry.name = req.body.name.trim();
  saveMeta(meta);
  res.json({ folder: entry });
});

router.get(FILES_ROUTE, authMiddleware, (req, res) => {
  const rawFolderId = req.query.folderId as string | undefined;
  const folderId = rawFolderId === 'null' ? null : (rawFolderId || null);
  const meta = loadMeta();

  const folders = meta
    .filter((f): f is FolderEntry => f.type === 'folder' && (f.folderId || null) === folderId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((folder) => ({
      ...folder,
      itemCount: meta.filter((item) => (item.folderId || null) === folder.id).length,
    }));

  const files = meta
    .filter((f): f is FileEntry => f.type === 'file' && (f.folderId || null) === folderId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const articles = meta
    .filter((f): f is ArticleEntry => f.type === 'article' && (f.folderId || null) === folderId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  res.json({
    folders,
    files,
    articles,
    breadcrumbs: buildBreadcrumbs(meta, folderId),
    storage: {
      usedBytes: getStorageUsageBytes(),
      limitBytes: storageLimitBytes(),
    },
  });
});

router.patch(`${FILES_ROUTE}/:id`, authMiddleware, (req, res) => {
  const meta = loadMeta();
  const entry = findMetaByType<FileEntry>(req.params.id, 'file');
  if (!entry) return res.status(404).json({ error: ERROR_MESSAGES.fileNotFound });

  if (Object.prototype.hasOwnProperty.call(req.body, 'folderId')) {
    const targetFolderId: string | null = req.body.folderId || null;
    if (targetFolderId && !findMetaByType<FolderEntry>(targetFolderId, 'folder')) {
      return res.status(400).json({ error: ERROR_MESSAGES.destinationFolderNotFound });
    }
    entry.folderId = targetFolderId;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
    const nameResult = validateFileName(req.body.name);
    if (nameResult.error) return res.status(400).json({ error: nameResult.error });
    entry.originalName = nameResult.value!;
  }

  saveMeta(meta);
  return res.json({ file: entry });
});

router.delete(
  `${FILES_ROUTE}/:id`,
  authMiddleware,
  asyncHandler((req, res) => {
    const entry = removeMeta(req.params.id);
    if (!entry) return res.status(404).json({ error: ERROR_MESSAGES.notFound });
    if (entry.type === 'file') deleteStoredFile(entry.storedName);
    res.json({ ok: true });
  }),
);

router.delete(
  `${FOLDERS_ROUTE}/:id`,
  authMiddleware,
  asyncHandler((req, res) => {
    const deleted = deleteFolderRecursive(req.params.id);
    if (!deleted.length) return res.status(404).json({ error: ERROR_MESSAGES.notFound });
    disposeDeletedEntries(deleted);
    for (const entry of deleted) {
      if (entry.type === 'article') deleteArticleContent(entry.id);
    }
    res.json({ ok: true, deleted: deleted.length });
  }),
);

export default router;
