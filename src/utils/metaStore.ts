import fs from 'fs';
import { config } from '../config.js';
import { normalizeFilename } from './filename.js';
import type { MetaEntry, FileEntry, FolderEntry } from '../types.js';

fs.mkdirSync(config.paths.uploads, { recursive: true });
fs.mkdirSync(config.paths.data, { recursive: true });
if (!fs.existsSync(config.paths.metaFile)) fs.writeFileSync(config.paths.metaFile, '[]');

export function loadMeta(): MetaEntry[] {
  try {
    const data = JSON.parse(fs.readFileSync(config.paths.metaFile, 'utf-8')) as MetaEntry[];
    let changed = false;
    for (const entry of data) {
      if (entry.type !== 'file' || !entry.originalName) continue;
      const normalized = normalizeFilename(entry.originalName);
      if (normalized !== entry.originalName) {
        entry.originalName = normalized;
        changed = true;
      }
    }
    if (changed) fs.writeFileSync(config.paths.metaFile, JSON.stringify(data, null, 2));
    return data;
  } catch {
    return [];
  }
}

export function saveMeta(data: MetaEntry[]): void {
  fs.writeFileSync(config.paths.metaFile, JSON.stringify(data, null, 2));
}

export function addMeta(entry: MetaEntry): MetaEntry {
  const meta = loadMeta();
  meta.push(entry);
  saveMeta(meta);
  return entry;
}

export function findMeta(id: string): MetaEntry | undefined {
  return loadMeta().find((f) => f.id === id);
}

export function removeMeta(id: string): MetaEntry | null {
  const meta = loadMeta();
  const entry = meta.find((f) => f.id === id);
  if (!entry) return null;
  saveMeta(meta.filter((f) => f.id !== id));
  return entry;
}

export function getFilesInFolder(folderId: string | null): FileEntry[] {
  return loadMeta().filter(
    (f): f is FileEntry => f.type === 'file' && (f.folderId || null) === folderId,
  );
}

export function getFoldersInFolder(folderId: string | null): FolderEntry[] {
  return loadMeta().filter(
    (f): f is FolderEntry => f.type === 'folder' && (f.folderId || null) === folderId,
  );
}

export function deleteFolderRecursive(id: string): MetaEntry[] {
  const meta = loadMeta();
  const toDelete = new Set([id]);

  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of meta) {
      if (entry.folderId && toDelete.has(entry.folderId) && !toDelete.has(entry.id)) {
        toDelete.add(entry.id);
        changed = true;
      }
    }
  }

  const deleted = meta.filter((f) => toDelete.has(f.id));
  saveMeta(meta.filter((f) => !toDelete.has(f.id)));
  return deleted;
}
