import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const adminPassword = process.env.ADMIN_PASSWORD?.trim();

if (!adminPassword) {
  throw new Error('ADMIN_PASSWORD is required. Copy .env.example to .env and set a strong password.');
}
if (adminPassword.length < 12) {
  throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
}

const requestedMaxFileSize = parseInt(process.env.MAX_FILE_SIZE || '200', 10);
const requestedMaxStorageGb = parseFloat(process.env.MAX_STORAGE_GB || '20');

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
    metaFile: string;
    public: string;
  };
  mimeWhitelist: string[];
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  adminPassword,
  isProduction: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
  maxFileSizeMb: Math.max(1, Math.min(Number.isFinite(requestedMaxFileSize) ? requestedMaxFileSize : 200, 200)),
  maxStorageGb: Math.max(0.01, Math.min(Number.isFinite(requestedMaxStorageGb) ? requestedMaxStorageGb : 20, 20)),
  maxFilesPerUpload: 20,
  paths: {
    root,
    uploads: path.join(root, 'uploads'),
    data: path.join(root, 'data'),
    metaFile: path.join(root, 'data', 'files.json'),
    public: path.join(root, 'public'),
  },
  mimeWhitelist: [
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
  ],
};
