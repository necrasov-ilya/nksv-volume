import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ALLOWED_UPLOAD_MIME_TYPES } from './constants/mime.js';
import {
  DEFAULT_PORT,
  MIN_ADMIN_PASSWORD_LENGTH,
  DEFAULT_MAX_FILE_SIZE_MB,
  MAX_ALLOWED_FILE_SIZE_MB,
  MIN_FILE_SIZE_MB,
  DEFAULT_MAX_STORAGE_GB,
  MAX_ALLOWED_STORAGE_GB,
  MIN_STORAGE_GB,
  MAX_FILES_PER_UPLOAD,
} from './constants/limits.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const adminPassword = process.env.ADMIN_PASSWORD?.trim();

if (!adminPassword) {
  throw new Error('ADMIN_PASSWORD is required. Copy .env.example to .env and set a strong password.');
}
if (adminPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
  throw new Error(`ADMIN_PASSWORD must contain at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
}

const requestedMaxFileSize = parseInt(process.env.MAX_FILE_SIZE || String(DEFAULT_MAX_FILE_SIZE_MB), 10);
const requestedMaxStorageGb = parseFloat(process.env.MAX_STORAGE_GB || String(DEFAULT_MAX_STORAGE_GB));

interface AppConfig {
  port: number;
  adminPassword: string;
  isProduction: boolean;
  trustProxy: number | boolean;
  maxFileSizeMb: number;
  maxStorageGb: number;
  maxFilesPerUpload: number;
  paths: {
    root: string;
    uploads: string;
    data: string;
    articles: string;
    metaFile: string;
    public: string;
  };
  mimeWhitelist: string[];
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || String(DEFAULT_PORT), 10),
  adminPassword,
  isProduction: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
  maxFileSizeMb: Math.max(
    MIN_FILE_SIZE_MB,
    Math.min(
      Number.isFinite(requestedMaxFileSize) ? requestedMaxFileSize : DEFAULT_MAX_FILE_SIZE_MB,
      MAX_ALLOWED_FILE_SIZE_MB,
    ),
  ),
  maxStorageGb: Math.max(
    MIN_STORAGE_GB,
    Math.min(
      Number.isFinite(requestedMaxStorageGb) ? requestedMaxStorageGb : DEFAULT_MAX_STORAGE_GB,
      MAX_ALLOWED_STORAGE_GB,
    ),
  ),
  maxFilesPerUpload: MAX_FILES_PER_UPLOAD,
  paths: {
    root,
    uploads: path.join(root, 'uploads'),
    data: path.join(root, 'data'),
    articles: path.join(root, 'data', 'articles'),
    metaFile: path.join(root, 'data', 'files.json'),
    public: path.join(root, 'public'),
  },
  mimeWhitelist: [...ALLOWED_UPLOAD_MIME_TYPES],
};
