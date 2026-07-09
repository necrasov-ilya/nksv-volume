import { Router } from 'express';
import { nanoid } from 'nanoid';
import { authMiddleware } from '../middleware/auth.js';
import {
  addMeta, findMeta, loadMeta, removeMeta, saveMeta,
} from '../utils/metaStore.js';
import {
  createArticleContentFile, deleteArticleContent, loadArticleContent, saveArticleContent,
} from '../utils/articleStore.js';
import type { ArticleContent, ArticleEntry, FileEntry } from '../types.js';

const router = Router();

function safeArticle(entry: ArticleEntry): Omit<ArticleEntry, never> {
  return entry;
}

router.get('/articles/assets/images', authMiddleware, (_req, res) => {
  const images = loadMeta()
    .filter((entry): entry is FileEntry => entry.type === 'file' && entry.mimeType.startsWith('image/'))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map((file) => ({
      id: file.id,
      filename: file.originalName,
      url: `/r/${file.id}`,
    }));
  res.json({ images });
});

router.post('/articles', authMiddleware, (req, res) => {
  const {
    title = 'Без названия',
    folderId = null,
    annotation,
    tags,
  } = req.body as {
    title?: string;
    folderId?: string | null;
    annotation?: string;
    tags?: string[];
  };

  if (folderId) {
    const parent = findMeta(folderId);
    if (!parent || parent.type !== 'folder') {
      return res.status(400).json({ error: 'Папка не найдена' });
    }
  }

  const now = new Date().toISOString();
  const entry: ArticleEntry = {
    id: nanoid(10),
    type: 'article',
    title: title.trim() || 'Без названия',
    annotation: annotation?.trim() || undefined,
    tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string') : undefined,
    status: 'draft',
    folderId: folderId || null,
    createdAt: now,
    updatedAt: now,
  };

  addMeta(entry);
  const content = createArticleContentFile(entry.id);
  res.status(201).json({ article: safeArticle(entry), content });
});

router.get('/articles/:id', authMiddleware, (req, res) => {
  const entry = findMeta(req.params.id);
  if (!entry || entry.type !== 'article') return res.status(404).json({ error: 'Статья не найдена' });
  const content = loadArticleContent(entry.id) ?? createArticleContentFile(entry.id);
  res.json({ article: safeArticle(entry), content });
});

router.put('/articles/:id', authMiddleware, (req, res) => {
  const meta = loadMeta();
  const entry = meta.find((item): item is ArticleEntry => item.id === req.params.id && item.type === 'article');
  if (!entry) return res.status(404).json({ error: 'Статья не найдена' });

  const body = req.body as {
    title?: string;
    annotation?: string;
    tags?: string[];
    coverImage?: string | null;
    status?: 'draft' | 'published';
    folderId?: string | null;
    content?: ArticleContent;
  };

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    const title = String(body.title ?? '').trim();
    if (!title) return res.status(400).json({ error: 'Заголовок не может быть пустым' });
    if (title.length > 200) return res.status(400).json({ error: 'Заголовок слишком длинный' });
    entry.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'annotation')) {
    entry.annotation = String(body.annotation ?? '').trim() || undefined;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'tags') && Array.isArray(body.tags)) {
    entry.tags = body.tags.filter((tag): tag is string => typeof tag === 'string');
  }

  if (Object.prototype.hasOwnProperty.call(body, 'coverImage')) {
    const coverImage = String(body.coverImage ?? '').trim();
    entry.coverImage = coverImage || undefined;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (body.status !== 'draft' && body.status !== 'published') {
      return res.status(400).json({ error: 'Недопустимый статус' });
    }
    entry.status = body.status;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'folderId')) {
    const targetFolderId = body.folderId || null;
    if (targetFolderId) {
      const target = meta.find((item) => item.id === targetFolderId && item.type === 'folder');
      if (!target) return res.status(400).json({ error: 'Папка назначения не найдена' });
    }
    entry.folderId = targetFolderId;
  }

  if (body.content) saveArticleContent(entry.id, body.content);

  entry.updatedAt = new Date().toISOString();
  saveMeta(meta);
  const content = loadArticleContent(entry.id);
  res.json({ article: safeArticle(entry), content });
});

router.delete('/articles/:id', authMiddleware, (req, res) => {
  const entry = removeMeta(req.params.id);
  if (!entry || entry.type !== 'article') return res.status(404).json({ error: 'Статья не найдена' });
  deleteArticleContent(entry.id);
  res.json({ ok: true });
});

export default router;