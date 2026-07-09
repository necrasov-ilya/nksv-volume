import { Router } from 'express';
import { nanoid } from 'nanoid';
import {
  ARTICLE_STATUS_DRAFT,
  ARTICLE_STATUS_PUBLISHED,
  DEFAULT_ARTICLE_TITLE,
} from '../constants/articles.js';
import { ERROR_MESSAGES } from '../constants/errors.js';
import { NANOID_ID_LENGTH } from '../constants/limits.js';
import { ARTICLES_ROUTE } from '../constants/routes.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  addMeta,
  findMetaByType,
  loadMeta,
  removeMeta,
  saveMeta,
} from '../utils/metaStore.js';
import {
  createArticleContentFile,
  deleteArticleContent,
  loadArticleContent,
  saveArticleContent,
} from '../utils/articleStore.js';
import { asyncHandler } from '../utils/routeHelpers.js';
import {
  findParentFolder,
  validateArticleTitle,
} from '../validation/meta.js';
import type { ArticleContent, ArticleEntry, FileEntry } from '../types.js';

const router = Router();

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

router.post(ARTICLES_ROUTE, authMiddleware, (req, res) => {
  const {
    title = DEFAULT_ARTICLE_TITLE,
    folderId = null,
    annotation,
    tags,
  } = req.body as {
    title?: string;
    folderId?: string | null;
    annotation?: string;
    tags?: string[];
  };

  if (folderId && !findParentFolder(folderId)) {
    return res.status(400).json({ error: ERROR_MESSAGES.folderNotFound });
  }

  const now = new Date().toISOString();
  const entry: ArticleEntry = {
    id: nanoid(NANOID_ID_LENGTH),
    type: 'article',
    title: title.trim() || DEFAULT_ARTICLE_TITLE,
    annotation: annotation?.trim() || undefined,
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
    status: ARTICLE_STATUS_DRAFT,
    folderId: folderId || null,
    createdAt: now,
    updatedAt: now,
  };

  addMeta(entry);
  const content = createArticleContentFile(entry.id);
  res.status(201).json({ article: entry, content });
});

router.get(
  `${ARTICLES_ROUTE}/:id`,
  authMiddleware,
  asyncHandler((req, res) => {
    const entry = findMetaByType<ArticleEntry>(req.params.id, 'article');
    if (!entry) return res.status(404).json({ error: ERROR_MESSAGES.articleNotFound });
    const content = loadArticleContent(entry.id) ?? createArticleContentFile(entry.id);
    res.json({ article: entry, content });
  }),
);

router.put(
  `${ARTICLES_ROUTE}/:id`,
  authMiddleware,
  asyncHandler((req, res) => {
    const meta = loadMeta();
    const entry = findMetaByType<ArticleEntry>(req.params.id, 'article');
    if (!entry) return res.status(404).json({ error: ERROR_MESSAGES.articleNotFound });

    const body = req.body as {
      title?: string;
      annotation?: string;
      tags?: string[];
      coverImage?: string | null;
      status?: typeof ARTICLE_STATUS_DRAFT | typeof ARTICLE_STATUS_PUBLISHED;
      folderId?: string | null;
      content?: ArticleContent;
    };

    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const titleResult = validateArticleTitle(body.title);
      if (titleResult.error) return res.status(400).json({ error: titleResult.error });
      entry.title = titleResult.value!;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'annotation')) {
      entry.annotation = String(body.annotation ?? '').trim() || undefined;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'tags') && Array.isArray(body.tags)) {
      entry.tags = body.tags.filter((tag): tag is string => typeof tag === 'string');
    }

    if (Object.prototype.hasOwnProperty.call(body, 'coverImage')) {
      entry.coverImage = String(body.coverImage ?? '').trim() || undefined;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      if (body.status !== ARTICLE_STATUS_DRAFT && body.status !== ARTICLE_STATUS_PUBLISHED) {
        return res.status(400).json({ error: ERROR_MESSAGES.invalidStatus });
      }
      entry.status = body.status;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'folderId')) {
      const targetFolderId: string | null = body.folderId || null;
      if (targetFolderId && !findParentFolder(targetFolderId, meta)) {
        return res.status(400).json({ error: ERROR_MESSAGES.destinationFolderNotFound });
      }
      entry.folderId = targetFolderId;
    }

    if (body.content) saveArticleContent(entry.id, body.content);

    entry.updatedAt = new Date().toISOString();
    saveMeta(meta);
    res.json({ article: entry, content: loadArticleContent(entry.id) });
  }),
);

router.delete(
  `${ARTICLES_ROUTE}/:id`,
  authMiddleware,
  asyncHandler((req, res) => {
    const entry = removeMeta(req.params.id);
    if (!entry || entry.type !== 'article') {
      return res.status(404).json({ error: ERROR_MESSAGES.articleNotFound });
    }
    deleteArticleContent(entry.id);
    res.json({ ok: true });
  }),
);

export default router;
