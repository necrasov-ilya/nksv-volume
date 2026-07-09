import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import type { MetaEntry } from '../types.js';

type MulterFile = Express.Multer.File;

const BYTES_PER_GB = 1024 ** 3;
const BYTES_PER_MB = 1024 ** 2;

export function getStorageUsageBytes(): number {
  return fs.readdirSync(config.paths.uploads, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .reduce((total, entry) => {
      try {
        return total + fs.statSync(path.join(config.paths.uploads, entry.name)).size;
      } catch {
        return total;
      }
    }, 0);
}

export function storageLimitBytes(): number {
  return config.maxStorageGb * BYTES_PER_GB;
}

export function maxFileSizeBytes(): number {
  return config.maxFileSizeMb * BYTES_PER_MB;
}

export function removeUploadedFiles(files: MulterFile[] = []): void {
  for (const file of files) {
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
  }
}

export function deleteStoredFile(storedName: string | undefined): void {
  if (!storedName) return;
  const filePath = path.join(config.paths.uploads, storedName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function disposeDeletedEntries(entries: MetaEntry[]): void {
  for (const entry of entries) {
    if (entry.type === 'file') deleteStoredFile(entry.storedName);
  }
}
