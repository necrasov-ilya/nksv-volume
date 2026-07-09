import type { ArticleStatus } from '../types';

export const DEFAULT_ARTICLE_TITLE = 'Без названия';

export const ARTICLE_STATUSES: Record<ArticleStatus, ArticleStatus> = {
  draft: 'draft',
  published: 'published',
};

/** Server-side title limit (kept here for client-side reference). */
export const MAX_ARTICLE_TITLE_LENGTH = 200;
export const MAX_TAG_COUNT = 10;
export const MAX_ANNOTATION_LENGTH = 500;

/** JPEG quality used when rendering the cropped cover image. */
export const COVER_IMAGE_QUALITY = 0.9;
