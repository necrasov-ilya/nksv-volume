import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { findMeta, loadMeta } from '../utils/metaStore.js';
import { loadArticleContent } from '../utils/articleStore.js';
import { renderArticle } from '../utils/articleRender.js';
import { sortKey } from '../utils/itemKind.js';
import type { ArticleEntry, FileEntry, FolderEntry, MetaEntry } from '../types.js';

const router = Router();

function safeFile(entry: FileEntry): Omit<FileEntry, 'storedName'> {
  const { storedName: _storedName, ...safe } = entry;
  return safe;
}

function safeArticleShare(entry: ArticleEntry) {
  return {
    id: entry.id,
    type: 'article' as const,
    title: entry.title,
    annotation: entry.annotation,
    coverImage: entry.coverImage,
    updatedAt: entry.updatedAt,
  };
}

function isPublicItem(item: MetaEntry): boolean {
  if (item.type === 'article') return item.status === 'published';
  return true;
}

function publicItemCount(meta: MetaEntry[], folderId: string): number {
  return meta.filter((child) => (child.folderId || null) === folderId && isPublicItem(child)).length;
}

function shareFolderItem(meta: MetaEntry[], item: MetaEntry) {
  if (item.type === 'folder') {
    return {
      id: item.id,
      type: 'folder' as const,
      name: item.name,
      itemCount: publicItemCount(meta, item.id),
    };
  }
  if (item.type === 'article') {
    return safeArticleShare(item);
  }
  return safeFile(item);
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
  if (entry.type === 'article') return res.json(safeArticleShare(entry));
  return res.json(safeFile(entry));
});

router.get('/api/share/:id', (req, res) => {
  const meta = loadMeta();
  const entry = meta.find((item) => item.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });

  if (entry.type === 'article') {
    if (entry.status !== 'published') return res.status(404).json({ error: 'Not found' });
    const content = loadArticleContent(entry.id);
    const rendered = renderArticle(content);
    return res.json({
      type: 'article',
      item: {
        ...safeArticleShare(entry),
        html: rendered.html,
        headings: rendered.headings,
      },
    });
  }

  if (entry.type === 'file') {
    return res.json({ type: 'file', item: safeFile(entry) });
  }

  const items = meta
    .filter((item) => {
      if ((item.folderId || null) !== entry.id) return false;
      if (item.type === 'article') return item.status === 'published';
      return true;
    })
    .sort((a, b) => {
      if (a.type === b.type) return sortKey(a).localeCompare(sortKey(b), 'ru');
      if (a.type === 'folder') return -1;
      if (b.type === 'folder') return 1;
      if (a.type === 'article') return -1;
      if (b.type === 'article') return 1;
      return 0;
    })
    .map((item) => shareFolderItem(meta, item));

  return res.json({
    type: 'folder',
    item: { id: entry.id, type: 'folder' as const, name: (entry as FolderEntry).name },
    items,
  });
});

router.get('/r/:id', (req, res) => {
  const entry = findMeta(req.params.id);
  if (!entry || entry.type !== 'file') return res.status(404).send('Not found');
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

router.get('/editor', (_req, res) => {
  const built = path.join(config.paths.public, 'editor', 'index.html');
  if (fs.existsSync(built)) return res.sendFile(built);
  return res.sendFile(path.join(config.paths.public, 'editor.html'));
});

export default router;