import assert from 'node:assert/strict';
import test from 'node:test';

const { renderArticle } = await import('../src/utils/articleRender.ts');

test('renders headings and custom blocks', () => {
  const result = renderArticle({
    content: [{
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Заголовок' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Жирный', marks: [{ type: 'bold' }] },
          ],
        },
        {
          type: 'keyIdea',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Идея' }],
          }],
        },
      ],
    }],
  });

  assert.match(result.html, /<h2 id="заголовок">Заголовок<\/h2>/);
  assert.match(result.html, /<strong>Жирный<\/strong>/);
  assert.match(result.html, /class="mdx-key-idea"/);
  assert.equal(result.headings.length, 1);
  assert.equal(result.headings[0].text, 'Заголовок');
});

test('escapes unsafe link targets', () => {
  const result = renderArticle({
    content: [{
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'link',
          marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
        }],
      }],
    }],
  });

  assert.match(result.html, /href="#"/);
  assert.doesNotMatch(result.html, /javascript:/);
});