import assert from 'node:assert/strict';
import test from 'node:test';

const {
  findParentFolder,
  validateArticleAnnotation,
  validateArticleTags,
  validateArticleTitle,
} = await import('../src/validation/meta.ts');

test('findParentFolder resolves a folder from the current metadata', () => {
  const folder = {
    id: 'folder-1',
    type: 'folder',
    name: 'Раздел',
    folderId: null,
    createdAt: new Date().toISOString(),
  };

  assert.equal(findParentFolder(folder.id, [folder]), folder);
  assert.equal(findParentFolder('missing', [folder]), undefined);
});

test('article title validation rejects malformed and oversized values', () => {
  assert.deepEqual(validateArticleTitle(null), { error: 'Заголовок не может быть пустым' });
  assert.deepEqual(validateArticleTitle('x'.repeat(201)), { error: 'Заголовок слишком длинный' });
  assert.deepEqual(validateArticleTitle('  Статья  '), { value: 'Статья' });
});

test('article metadata validation limits annotation and tags on the server', () => {
  assert.deepEqual(validateArticleAnnotation('  Короткая аннотация  '), { value: 'Короткая аннотация' });
  assert.deepEqual(validateArticleAnnotation('x'.repeat(501)), { error: 'Аннотация слишком длинная' });
  assert.deepEqual(validateArticleTags([' js ', 'js', 'typescript']), { value: ['js', 'typescript'] });
  assert.deepEqual(validateArticleTags(Array.from({ length: 11 }, (_, index) => `tag-${index}`)), {
    error: 'Слишком много тегов',
  });
});
