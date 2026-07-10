import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nksv-meta-'));
process.env.ADMIN_PASSWORD = 'test-password-for-meta-store';

const { config } = await import('../src/config.ts');
config.paths.data = path.join(tempRoot, 'data');
config.paths.articles = path.join(config.paths.data, 'articles');
config.paths.metaFile = path.join(config.paths.data, 'files.json');
config.paths.uploads = path.join(tempRoot, 'uploads');

fs.mkdirSync(config.paths.data, { recursive: true });
fs.writeFileSync(config.paths.metaFile, '{not-json');

const { loadMeta } = await import('../src/utils/metaStore.ts');

test('rejects corrupt metadata instead of treating the catalog as empty', () => {
  try {
    assert.throws(() => loadMeta(), /Unable to read metadata file/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
