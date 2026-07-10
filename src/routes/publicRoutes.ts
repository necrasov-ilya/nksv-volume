import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { ARTICLE_STATUS_PUBLISHED } from '../constants/articles.js';
import { ERROR_MESSAGES } from '../constants/errors.js';
import {
  EDITOR_ROUTE,
  PUBLIC_CONFIG_ROUTE,
  PUBLIC_FILE_ID_ROUTE,
  PUBLIC_META_ROUTE,
  PUBLIC_SHARE_ROUTE,
  PUBLIC_VIEWER_ID_ROUTE,
} from '../constants/routes.js';
import { loadArticleContent } from '../utils/articleStore.js';
import { renderArticle } from '../utils/articleRender.js';
import { findMetaByType, findMeta, loadMeta } from '../utils/metaStore.js';
import { streamWithRange } from '../utils/rangeStream.js';
import { compareSharedItems } from '../utils/sortItems.js';
import type { ArticleEntry, FileEntry, FolderEntry, MetaEntry } from '../types.js';

const router = Router();

type ShareArticleView = Omit<ArticleEntry, 'tags' | 'folderId' | 'createdAt' | 'status'>;

function safeFile(entry: FileEntry): Omit<FileEntry, 'storedName'> {
  const { storedName: _storedName, ...safe } = entry;
  return safe;
}

function safeArticleShare(entry: ArticleEntry): ShareArticleView {
  return {
    id: entry.id,
    type: 'article',
    title: entry.title,
    annotation: entry.annotation,
    coverImage: entry.coverImage,
    updatedAt: entry.updatedAt,
  };
}

function isPublicItem(item: MetaEntry): boolean {
  if (item.type === 'article') return item.status === ARTICLE_STATUS_PUBLISHED;
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
  if (item.type === 'article') return safeArticleShare(item);
  return safeFile(item);
}

router.get(PUBLIC_CONFIG_ROUTE, (_req, res) => {
  res.json({
    maxFileSizeMb: config.maxFileSizeMb,
    maxFilesPerUpload: config.maxFilesPerUpload,
    maxStorageGb: config.maxStorageGb,
  });
});

router.get(PUBLIC_META_ROUTE, (req, res) => {
  const entry = findMeta(req.params.id);
  if (!entry || entry.type === 'folder') {
    return res.status(404).json({ error: ERROR_MESSAGES.notFound });
  }
  if (entry.type === 'article') {
    if (entry.status !== ARTICLE_STATUS_PUBLISHED) {
      return res.status(404).json({ error: ERROR_MESSAGES.notFound });
    }
    return res.json(safeArticleShare(entry));
  }
  return res.json(safeFile(entry));
});

router.get(PUBLIC_SHARE_ROUTE, (req, res) => {
  const meta = loadMeta();
  const entry = meta.find((item) => item.id === req.params.id);
  if (!entry) return res.status(404).json({ error: ERROR_MESSAGES.notFound });

  if (entry.type === 'article') {
    if (entry.status !== ARTICLE_STATUS_PUBLISHED) {
      return res.status(404).json({ error: ERROR_MESSAGES.notFound });
    }
    const rendered = renderArticle(loadArticleContent(entry.id));
    return res.json({
      type: 'article',
      item: { ...safeArticleShare(entry), html: rendered.html, headings: rendered.headings },
    });
  }

  if (entry.type === 'file') {
    return res.json({ type: 'file', item: safeFile(entry) });
  }

  const folder = entry as FolderEntry;
  const items = meta
    .filter((item) => {
      if ((item.folderId || null) !== folder.id) return false;
      if (item.type === 'article') return item.status === ARTICLE_STATUS_PUBLISHED;
      return true;
    })
    .sort(compareSharedItems)
    .map((item) => shareFolderItem(meta, item));

  return res.json({
    type: 'folder',
    item: { id: folder.id, type: 'folder' as const, name: folder.name },
    items,
  });
});

router.get(PUBLIC_FILE_ID_ROUTE, (req, res) => {
  const entry = findMetaByType<FileEntry>(req.params.id, 'file');
  if (!entry) return res.status(404).send(ERROR_MESSAGES.notFound);
  const filePath = path.join(config.paths.uploads, entry.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).send('File missing');
  streamWithRange(res, {
    filePath,
    totalSize: entry.size,
    mimeType: entry.mimeType,
    originalName: entry.originalName,
    rangeHeader: req.headers.range,
  });
});

router.get(PUBLIC_VIEWER_ID_ROUTE, (_req, res) => {
  res.sendFile(path.join(config.paths.public, 'viewer.html'));
});

function serveEditor(req: import('express').Request, res: import('express').Response) {
  const built = path.join(config.paths.public, 'editor', 'index.html');
  if (fs.existsSync(built)) return res.sendFile(built);

  if (!config.isProduction) {
    const queryIndex = req.originalUrl.indexOf('?');
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
    return res.redirect(302, `http://127.0.0.1:5173/editor/${query}`);
  }

  return res.sendFile(path.join(config.paths.public, 'editor.html'));
}

router.get([EDITOR_ROUTE, `${EDITOR_ROUTE}/`], serveEditor);

export default router;
