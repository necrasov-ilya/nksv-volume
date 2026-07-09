import {
  MAX_FOLDER_NAME_LENGTH,
  MAX_FILE_NAME_LENGTH,
  MAX_ARTICLE_TITLE_LENGTH,
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

export function findParentFolder(
  folderId: string | null | undefined,
  meta?: MetaEntry[],
): FolderEntry | undefined {
  if (!folderId) return undefined;
  const source = meta ?? [];
  return source.find((item): item is FolderEntry => item.id === folderId && item.type === 'folder');
}
