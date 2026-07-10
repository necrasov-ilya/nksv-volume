import fs from 'fs';
import { config } from '../config.js';
import { normalizeFilename } from './filename.js';
import { writeJsonAtomically } from './jsonFile.js';
import type { MetaEntry, FileEntry, FolderEntry, ArticleEntry } from '../types.js';

fs.mkdirSync(config.paths.uploads, { recursive: true });
fs.mkdirSync(config.paths.data, { recursive: true });
if (!fs.existsSync(config.paths.metaFile)) writeJsonAtomically(config.paths.metaFile, []);

let cachedMeta: MetaEntry[] | null = null;

function readMetaFile(): MetaEntry[] {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(config.paths.metaFile, 'utf-8'));
    if (!Array.isArray(parsed)) throw new Error('Metadata root must be an array');
    return parsed as MetaEntry[];
  } catch (error) {
    throw new Error(`Unable to read metadata file ${config.paths.metaFile}`, { cause: error });
  }
}

function normalizeMetaEntries(data: MetaEntry[]): boolean {
  let changed = false;
  for (const entry of data) {
    if (entry.type !== 'file' || !entry.originalName) continue;
    const normalized = normalizeFilename(entry.originalName);
    if (normalized !== entry.originalName) {
      entry.originalName = normalized;
      changed = true;
    }
  }
  return changed;
}

export function loadMeta(): MetaEntry[] {
  if (cachedMeta) return structuredClone(cachedMeta);

  const data = readMetaFile();
  const changed = normalizeMetaEntries(data);
  if (changed) writeJsonAtomically(config.paths.metaFile, data);
  cachedMeta = data;
  return structuredClone(data);
}

export function saveMeta(data: MetaEntry[]): void {
  writeJsonAtomically(config.paths.metaFile, data);
  cachedMeta = structuredClone(data);
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

export function findMetaByType<T extends MetaEntry>(
  id: string,
  type: T['type'],
): T | undefined {
  const entry = findMeta(id);
  return entry && entry.type === type ? (entry as T) : undefined;
}

export function removeMetaByType<T extends MetaEntry>(
  id: string,
  type: T['type'],
): T | null {
  const meta = loadMeta();
  const entry = meta.find((item): item is T => item.id === id && item.type === type);
  if (!entry) return null;
  saveMeta(meta.filter((item) => item.id !== id));
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

export function getArticlesInFolder(folderId: string | null): ArticleEntry[] {
  return loadMeta().filter(
    (f): f is ArticleEntry => f.type === 'article' && (f.folderId || null) === folderId,
  );
}

export function getItemsInFolder(folderId: string | null): MetaEntry[] {
  return loadMeta().filter((entry) => (entry.folderId || null) === folderId);
}

export function deleteFolderRecursive(id: string): MetaEntry[] {
  const meta = loadMeta();
  const folder = meta.find((entry): entry is FolderEntry => entry.id === id && entry.type === 'folder');
  if (!folder) return [];
  const childrenByParent = new Map<string | null, MetaEntry[]>();
  for (const entry of meta) {
    const key = entry.folderId || null;
    const list = childrenByParent.get(key) ?? [];
    list.push(entry);
    childrenByParent.set(key, list);
  }

  const toDelete = new Set<string>();
  function collect(parentId: string) {
    if (toDelete.has(parentId)) return;
    toDelete.add(parentId);
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (child.type === 'folder') collect(child.id);
      else toDelete.add(child.id);
    }
  }
  collect(id);

  const deleted = meta.filter((f) => toDelete.has(f.id));
  saveMeta(meta.filter((f) => !toDelete.has(f.id)));
  return deleted;
}
