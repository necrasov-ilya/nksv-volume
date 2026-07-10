import assert from 'node:assert/strict';
import test from 'node:test';

const { breadcrumbsTemplate } = await import('../public/js/fileList/render.ts');

test('the up breadcrumb points to the parent folder', () => {
  const html = breadcrumbsTemplate([
    { id: 'parent', name: 'Родитель' },
    { id: 'current', name: 'Текущая папка' },
  ]);

  assert.match(html, /class="crumb-up"[^>]*data-folder-id="parent"/);
});
