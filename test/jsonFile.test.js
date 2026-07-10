import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const { writeJsonAtomically } = await import('../src/utils/jsonFile.ts');

test('writes JSON through an atomic rename without leaving a temporary file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nksv-json-'));
  const filePath = path.join(directory, 'data.json');

  try {
    writeJsonAtomically(filePath, { version: 1, entries: ['one'] });
    assert.deepEqual(JSON.parse(fs.readFileSync(filePath, 'utf-8')), { version: 1, entries: ['one'] });
    assert.equal(fs.readdirSync(directory).some((name) => name.endsWith('.tmp')), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
