import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { findMeta, loadMeta } from '../utils/metaStore.js';
import type { FileEntry, FolderEntry, MetaEntry } from '../types.js';

const router = Router();

function safeFile(entry: FileEntry): Omit<FileEntry, 'storedName'> {
  const { storedName: _storedName, ...safe } = entry;
  return safe;
}

router.get('/api/config', (_req, res) => {
  res.json({
    maxFileSizeMb: config.maxFileSizeMb,
    maxFilesPerUpload: config.maxFilesPerUpload,
    maxStorageGb: config.maxStorageGb,
  });
});

router.get('/api/meta/:id', (req, res) => {
  const entry = findMeta(req.params.id);
  if (!entry || entry.type === 'folder') return res.status(404).json({ error: 'Not found' });
  res.json(safeFile(entry));
});

router.get('/api/share/:id', (req, res) => {
  const meta = loadMeta();
  const entry = meta.find((item) => item.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });

  if (entry.type !== 'folder') {
    return res.json({ type: 'file', item: safeFile(entry) });
  }

  const items = meta
    .filter((item) => (item.folderId || null) === entry.id)
    .sort((a, b) => {
      if (a.type === b.type) {
        const left = (a.type === 'folder' ? a.name : a.originalName) || '';
        const right = (b.type === 'folder' ? b.name : b.originalName) || '';
        return left.localeCompare(right, 'ru');
      }
      return a.type === 'folder' ? -1 : 1;
    })
    .map((item) => (item.type === 'folder'
      ? {
          id: item.id,
          type: 'folder' as const,
          name: item.name,
          itemCount: meta.filter((child) => (child.folderId || null) === item.id).length,
        }
      : safeFile(item)));

  return res.json({
    type: 'folder',
    item: { id: entry.id, type: 'folder' as const, name: entry.name },
    items,
  });
});

router.get('/r/:id', (req, res) => {
  const entry = findMeta(req.params.id);
  if (!entry || entry.type === 'folder') return res.status(404).send('Not found');
  const filePath = path.join(config.paths.uploads, entry.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).send('File missing');
  res.setHeader('Content-Type', entry.mimeType);
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(entry.originalName)}`);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'");

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.setHeader('Content-Range', `bytes */${entry.size}`);
      return res.status(416).end();
    }
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), entry.size - 1) : entry.size - 1;
    if (start > end || start >= entry.size) {
      res.setHeader('Content-Range', `bytes */${entry.size}`);
      return res.status(416).end();
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${entry.size}`);
    res.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  res.setHeader('Content-Length', entry.size);
  return fs.createReadStream(filePath).pipe(res);
});

router.get('/v/:id', (_req, res) => {
  res.sendFile(path.join(config.paths.public, 'viewer.html'));
});

export default router;
