import {
  MAX_FOLDER_NAME_LENGTH,
  MAX_FILE_NAME_LENGTH,
  MAX_ARTICLE_TITLE_LENGTH,
  MAX_ANNOTATION_LENGTH,
  MAX_TAG_COUNT,
  MAX_TAG_LENGTH,
} from '../constants/limits.js';
import { ERROR_MESSAGES } from '../constants/errors.js';
import type { FolderEntry, MetaEntry } from '../types.js';

export interface ValidationResult<T> {
  value?: T;
  error?: string;
}

export function validateFolderName(name: unknown): ValidationResult<string> {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return { error: ERROR_MESSAGES.folderNameRequired };
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) return { error: ERROR_MESSAGES.folderNameTooLong };
  return { value: trimmed };
}

export function validateFileName(name: unknown): ValidationResult<string> {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return { error: ERROR_MESSAGES.fileNameEmpty };
  if (trimmed.length > MAX_FILE_NAME_LENGTH) return { error: ERROR_MESSAGES.fileNameTooLong };
  return { value: trimmed };
}

export function validateArticleTitle(title: unknown): ValidationResult<string> {
  const trimmed = String(title ?? '').trim();
  if (!trimmed) return { error: ERROR_MESSAGES.titleEmpty };
  if (trimmed.length > MAX_ARTICLE_TITLE_LENGTH) return { error: ERROR_MESSAGES.titleTooLong };
  return { value: trimmed };
}

export function validateArticleAnnotation(annotation: unknown): ValidationResult<string | undefined> {
  if (annotation === null || annotation === undefined) return { value: undefined };
  if (typeof annotation !== 'string') return { error: ERROR_MESSAGES.invalidRequest };
  const trimmed = annotation.trim();
  if (trimmed.length > MAX_ANNOTATION_LENGTH) return { error: ERROR_MESSAGES.annotationTooLong };
  return { value: trimmed || undefined };
}

export function validateArticleTags(tags: unknown): ValidationResult<string[] | undefined> {
  if (tags === null || tags === undefined) return { value: undefined };
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
    return { error: ERROR_MESSAGES.invalidTags };
  }

  const normalized = tags.map((tag) => tag.trim()).filter(Boolean);
  if (normalized.length > MAX_TAG_COUNT) return { error: ERROR_MESSAGES.tooManyTags };
  if (normalized.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    return { error: ERROR_MESSAGES.tagTooLong };
  }
  return { value: [...new Set(normalized)] };
}

export function findParentFolder(
  folderId: string | null | undefined,
  meta: MetaEntry[],
): FolderEntry | undefined {
  if (!folderId) return undefined;
  return meta.find((item): item is FolderEntry => item.id === folderId && item.type === 'folder');
}
