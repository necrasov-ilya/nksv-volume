import { Router, type RequestHandler } from 'express';
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
  removeMetaByType,
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
let reservedUploadBytes = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const reserveUploadCapacity: RequestHandler = (req, res, next) => {
  const rawLength = req.headers['content-length'];
  const declaredBytes = typeof rawLength === 'string' ? Number(rawLength) : Number.NaN;
  if (!Number.isFinite(declaredBytes) || declaredBytes <= 0) return next();

  if (getStorageUsageBytes() + reservedUploadBytes + declaredBytes > storageLimitBytes()) {
    return res.status(507).json({ error: ERROR_MESSAGES.storageFull(config.maxStorageGb) });
  }

  reservedUploadBytes += declaredBytes;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    reservedUploadBytes -= declaredBytes;
  };
  res.once('finish', release);
  res.once('close', release);
  next();
};

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
  reserveUploadCapacity,
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
  if (!isRecord(req.body)) {
    return res.status(400).json({ error: ERROR_MESSAGES.invalidRequest });
  }

  const { name, folderId = null } = req.body as { name?: string; folderId?: string | null };
  const nameResult = validateFolderName(name);
  if (nameResult.error) return res.status(400).json({ error: nameResult.error });

  const meta = loadMeta();
  const parentResult = findParentFolder(folderId, meta);
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
  if (!isRecord(req.body)) {
    return res.status(400).json({ error: ERROR_MESSAGES.invalidRequest });
  }

  let nameResult;
  if (req.body.name !== undefined) {
    nameResult = validateFolderName(req.body.name);
    if (nameResult.error) return res.status(400).json({ error: nameResult.error });
  }

  const meta = loadMeta();
  const entry = meta.find((item): item is FolderEntry => item.id === req.params.id && item.type === 'folder');
  if (!entry) return res.status(404).json({ error: ERROR_MESSAGES.notFound });
  if (nameResult?.value) entry.name = nameResult.value;
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
  if (!isRecord(req.body)) {
    return res.status(400).json({ error: ERROR_MESSAGES.invalidRequest });
  }

  const meta = loadMeta();
  const entry = meta.find((item): item is FileEntry => item.id === req.params.id && item.type === 'file');
  if (!entry) return res.status(404).json({ error: ERROR_MESSAGES.fileNotFound });

  if (Object.prototype.hasOwnProperty.call(req.body, 'folderId')) {
    const rawFolderId = req.body.folderId;
    if (rawFolderId !== null && rawFolderId !== undefined && typeof rawFolderId !== 'string') {
      return res.status(400).json({ error: ERROR_MESSAGES.invalidRequest });
    }
    const targetFolderId = rawFolderId || null;
    if (targetFolderId && !meta.some((item) => item.id === targetFolderId && item.type === 'folder')) {
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
    const entry = removeMetaByType<FileEntry>(req.params.id, 'file');
    if (!entry) return res.status(404).json({ error: ERROR_MESSAGES.notFound });
    deleteStoredFile(entry.storedName);
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
