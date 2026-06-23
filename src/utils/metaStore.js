import fs from 'fs';
import { config } from '../config.js';
import { normalizeFilename } from './filename.js';

fs.mkdirSync(config.paths.uploads, { recursive: true });
fs.mkdirSync(config.paths.data, { recursive: true });
if (!fs.existsSync(config.paths.metaFile)) fs.writeFileSync(config.paths.metaFile, '[]');

export function loadMeta() {
  try {
    const data = JSON.parse(fs.readFileSync(config.paths.metaFile, 'utf-8'));
    let changed = false;
    for (const entry of data) {
      if (!entry.originalName) continue;
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

export function saveMeta(data) {
  fs.writeFileSync(config.paths.metaFile, JSON.stringify(data, null, 2));
}

export function addMeta(entry) {
  const meta = loadMeta();
  meta.push(entry);
  saveMeta(meta);
  return entry;
}

export function findMeta(id) {
  return loadMeta().find((f) => f.id === id);
}

export function removeMeta(id) {
  const meta = loadMeta();
  const entry = meta.find((f) => f.id === id);
  if (!entry) return null;
  saveMeta(meta.filter((f) => f.id !== id));
  return entry;
}

export function getFilesInFolder(folderId) {
  return loadMeta().filter((f) => (f.folderId || null) === folderId);
}

export function getFoldersInFolder(folderId) {
  return loadMeta().filter((f) => f.type === 'folder' && (f.folderId || null) === folderId);
}

export function deleteFolderRecursive(id) {
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
