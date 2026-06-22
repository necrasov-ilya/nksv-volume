import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  adminPassword: process.env.ADMIN_PASSWORD || 'changeme',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE || '500', 10),
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
