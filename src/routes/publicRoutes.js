import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { findMeta } from '../utils/metaStore.js';

const router = Router();

router.get('/api/meta/:id', (req, res) => {
  const entry = findMeta(req.params.id);
  if (!entry || entry.type === 'folder') return res.status(404).json({ error: 'Not found' });
  const { storedName, ...safe } = entry;
  res.json(safe);
});

router.get('/r/:id', (req, res) => {
  const entry = findMeta(req.params.id);
  if (!entry || entry.type === 'folder') return res.status(404).send('Not found');
  const filePath = path.join(config.paths.uploads, entry.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).send('File missing');
  res.setHeader('Content-Type', entry.mimeType);
  res.setHeader('Content-Disposition', 'inline');
  fs.createReadStream(filePath).pipe(res);
});

router.get('/v/:id', (_req, res) => {
  res.sendFile(path.join(config.paths.public, 'viewer.html'));
});

export default router;
