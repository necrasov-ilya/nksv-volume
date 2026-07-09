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

test('renders list items with inline text nodes', () => {
  const result = renderArticle({
    content: [{
      type: 'doc',
      content: [{
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'text', text: 'Первый пункт' }],
          },
          {
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: 'Второй пункт' }],
            }],
          },
        ],
      }],
    }],
  });

  assert.match(result.html, /<li>Первый пункт<\/li>/);
  assert.match(result.html, /<li><p>Второй пункт<\/p>\s*<\/li>/);
});

test('renders horizontal rules from blocks and markdown paragraphs', () => {
  const result = renderArticle({
    content: [{
      type: 'doc',
      content: [
        { type: 'horizontalRule' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '---' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '***' }],
        },
      ],
    }],
  });

  assert.equal((result.html.match(/<hr>/g) || []).length, 3);
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