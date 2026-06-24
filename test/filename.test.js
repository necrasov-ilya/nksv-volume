import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFilename } from '../src/utils/filename.js';

test('keeps a valid Cyrillic filename unchanged', () => {
  assert.equal(normalizeFilename('изображение.png'), 'изображение.png');
  assert.equal(normalizeFilename('тестовый файл.mp4'), 'тестовый файл.mp4');
});

test('repairs a UTF-8 filename exposed as latin1', () => {
  const original = 'изображение.png';
  const mojibake = Buffer.from(original, 'utf8').toString('latin1');

  assert.equal(normalizeFilename(mojibake), original);
});

test('keeps ordinary latin filenames unchanged', () => {
  assert.equal(normalizeFilename('report-2026.pdf'), 'report-2026.pdf');
});
