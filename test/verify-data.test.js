import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'verify-data.mjs');

function runVerify(env) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf-8',
  });
}

test('verify-data passes on valid meta and uploads', () => {
  const result = runVerify({
    META_FILE: path.join(root, 'data', 'files.json'),
    UPLOADS_DIR: path.join(root, 'uploads'),
  });

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Итог: OK/);
  assert.match(result.stdout, /file: [1-9]/);
});

test('verify-data fails when stored file is missing', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nksv-verify-'));
  const metaFile = path.join(tempDir, 'files.json');
  const uploadsDir = path.join(tempDir, 'uploads');
  fs.mkdirSync(uploadsDir);
  fs.writeFileSync(metaFile, JSON.stringify([{
    id: 'abc123',
    type: 'file',
    storedName: 'missing.png',
    originalName: 'missing.png',
    mimeType: 'image/png',
    size: 1,
    folderId: null,
    uploadedAt: new Date().toISOString(),
  }], null, 2));

  const result = runVerify({ META_FILE: metaFile, UPLOADS_DIR: uploadsDir });
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /нет бинарника/);
});