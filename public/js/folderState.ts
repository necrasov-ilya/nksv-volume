import { FOLDER_STORAGE_KEY } from './constants/storage.js';

export function getFolderId(): string | null {
  return sessionStorage.getItem(FOLDER_STORAGE_KEY);
}

export function setFolderId(id: string | null): void {
  if (id) sessionStorage.setItem(FOLDER_STORAGE_KEY, id);
  else sessionStorage.removeItem(FOLDER_STORAGE_KEY);
}
