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
  removeMetaByType,
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
  validateArticleAnnotation,
  validateArticleTags,
  validateArticleTitle,
} from '../validation/meta.js';
import type { ArticleContent, ArticleEntry, FileEntry } from '../types.js';

const router = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isArticleContent(value: unknown): value is ArticleContent {
  return isRecord(value) && Array.isArray(value.content);
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

router.post(ARTICLES_ROUTE, authMiddleware, (req, res) => {
  if (!isRecord(req.body)) {
    return res.status(400).json({ error: ERROR_MESSAGES.invalidRequest });
  }

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

  const meta = loadMeta();
  if (folderId && !findParentFolder(folderId, meta)) {
    return res.status(400).json({ error: ERROR_MESSAGES.folderNotFound });
  }

  const titleResult = validateArticleTitle(title);
  if (titleResult.error) return res.status(400).json({ error: titleResult.error });
  const annotationResult = validateArticleAnnotation(annotation);
  if (annotationResult.error) return res.status(400).json({ error: annotationResult.error });
  const tagsResult = validateArticleTags(tags);
  if (tagsResult.error) return res.status(400).json({ error: tagsResult.error });

  const now = new Date().toISOString();
  const entry: ArticleEntry = {
    id: nanoid(NANOID_ID_LENGTH),
    type: 'article',
    title: titleResult.value!,
    annotation: annotationResult.value,
    tags: tagsResult.value,
    status: ARTICLE_STATUS_DRAFT,
    folderId: folderId || null,
    createdAt: now,
    updatedAt: now,
  };

  const content = createArticleContentFile(entry.id);
  try {
    addMeta(entry);
  } catch (error) {
    deleteArticleContent(entry.id);
    throw error;
  }
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
    if (!isRecord(req.body)) {
      return res.status(400).json({ error: ERROR_MESSAGES.invalidRequest });
    }

    const meta = loadMeta();
    const entry = meta.find((item): item is ArticleEntry => item.id === req.params.id && item.type === 'article');
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

    const hasContent = Object.prototype.hasOwnProperty.call(body, 'content');
    if (hasContent && !isArticleContent(body.content)) {
      return res.status(400).json({ error: ERROR_MESSAGES.invalidArticleContent });
    }

    if (Object.prototype.hasOwnProperty.call(body, 'title')) {
      const titleResult = validateArticleTitle(body.title);
      if (titleResult.error) return res.status(400).json({ error: titleResult.error });
      entry.title = titleResult.value!;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'annotation')) {
      const annotationResult = validateArticleAnnotation(body.annotation);
      if (annotationResult.error) return res.status(400).json({ error: annotationResult.error });
      entry.annotation = annotationResult.value;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'tags')) {
      const tagsResult = validateArticleTags(body.tags);
      if (tagsResult.error) return res.status(400).json({ error: tagsResult.error });
      entry.tags = tagsResult.value;
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

    entry.updatedAt = new Date().toISOString();
    const previousContent = hasContent ? loadArticleContent(entry.id) : null;
    if (hasContent) saveArticleContent(entry.id, body.content!);

    try {
      saveMeta(meta);
    } catch (error) {
      if (hasContent) {
        if (previousContent) saveArticleContent(entry.id, previousContent);
        else deleteArticleContent(entry.id);
      }
      throw error;
    }

    res.json({ article: entry, content: hasContent ? body.content : loadArticleContent(entry.id) });
  }),
);

router.delete(
  `${ARTICLES_ROUTE}/:id`,
  authMiddleware,
  asyncHandler((req, res) => {
    const entry = removeMetaByType<ArticleEntry>(req.params.id, 'article');
    if (!entry) {
      return res.status(404).json({ error: ERROR_MESSAGES.articleNotFound });
    }
    deleteArticleContent(entry.id);
    res.json({ ok: true });
  }),
);

export default router;
