import type { MetaEntry, FolderEntry } from '../types.js';

export function buildBreadcrumbs(meta: MetaEntry[], folderId: string | null): { id: string; name: string }[] {
  const crumbs: { id: string; name: string }[] = [];
  let currentId = folderId;
  while (currentId) {
    const folder = meta.find((f): f is FolderEntry => f.id === currentId && f.type === 'folder');
    if (!folder) break;
    crumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.folderId;
  }
  return crumbs;
}

export function buildFolderPath(meta: MetaEntry[], folder: FolderEntry): string {
  const names = [folder.name];
  const visited = new Set([folder.id]);
  let parentId = folder.folderId;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = meta.find((entry): entry is FolderEntry => entry.id === parentId && entry.type === 'folder');
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.folderId;
  }
  return names.join(' / ');
}
