import assert from 'node:assert/strict';
import test from 'node:test';

const { normalizeFilename } = await import('../src/utils/filename.ts');

test('keeps correctly decoded Cyrillic filenames intact', () => {
  assert.equal(normalizeFilename('изображение.png'), 'изображение.png');
});

test('decodes UTF-8 filenames interpreted as Latin-1 by multipart parsers', () => {
  assert.equal(normalizeFilename('Ð¸Ð·Ð¾Ð±Ñ\u0080Ð°Ð¶ÐµÐ½Ð¸Ðµ.png'), 'изображение.png');
});
