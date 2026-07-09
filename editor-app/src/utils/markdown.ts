import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { MARKDOWN_PASTE } from '../constants/editor.js';

export function safeParse<T>(parser: { parse: (value: string) => T } | undefined, text: string): T | null {
  if (!parser) return null;
  try {
    return parser.parse(text);
  } catch {
    return null;
  }
}

export function looksLikeMarkdown(text: string): boolean {
  const sample = text.trim();
  if (!sample || sample.length < MARKDOWN_PASTE.MIN_SAMPLE_LENGTH) return false;

  if ((sample.match(MARKDOWN_PASTE.HEADING_PATTERN) || []).length >= 1) return true;
  if ((sample.match(MARKDOWN_PASTE.TABLE_ROW_PATTERN) || []).length >= MARKDOWN_PASTE.TABLE_ROW_MIN_MATCHES) return true;
  if (MARKDOWN_PASTE.LIST_QUOTE_PATTERN.test(sample)) return true;
  if (MARKDOWN_PASTE.CODE_FENCE_PATTERN.test(sample)) return true;
  if (MARKDOWN_PASTE.BOLD_PATTERN.test(sample)) return true;
  if (MARKDOWN_PASTE.ITALIC_ASTERISK_PATTERN.test(sample)) return true;
  if (MARKDOWN_PASTE.ITALIC_UNDERSCORE_PATTERN.test(sample)) return true;
  if (MARKDOWN_PASTE.LINK_PATTERN.test(sample)) return true;
  if (MARKDOWN_PASTE.IMAGE_PATTERN.test(sample)) return true;
  if (MARKDOWN_PASTE.HORIZONTAL_RULE_PATTERN.test(sample)) return true;

  return false;
}

export function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(MARKDOWN_PASTE.PIPE_LEADING_PATTERN, '')
    .replace(MARKDOWN_PASTE.PIPE_TRAILING_PATTERN, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function isTableSeparator(line: string): boolean {
  return MARKDOWN_PASTE.TABLE_SEPARATOR_PATTERN.test(line.trim());
}

export function parsePipeTable(block: string): JSONContent | null {
  const lines = block.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('|'));
  if (lines.length < MARKDOWN_PASTE.MIN_TABLE_ROWS || !isTableSeparator(lines[1]!)) return null;

  const columns = parseTableRow(lines[0]!);
  const rows = lines.slice(2).map(parseTableRow).filter((row) => row.some((cell) => cell));
  if (!columns.length) return null;

  return {
    type: MARKDOWN_PASTE.DEFAULT_COMPARE_TABLE_TYPE,
    attrs: { caption: '', columns, rows },
  };
}

export function parseMarkdownBlocks(
  markdown: string,
  parser: { parse: (value: string) => JSONContent },
): JSONContent[] {
  const blocks = markdown.trim().split(MARKDOWN_PASTE.BLOCK_SEPARATOR);
  const nodes: JSONContent[] = [];

  for (const block of blocks) {
    const table = parsePipeTable(block);
    if (table) {
      nodes.push(table);
      continue;
    }
    const parsed = safeParse(parser, block);
    if (parsed) {
      const chunk = (parsed.content ?? []).filter((node) => node?.type);
      if (chunk.length) {
        nodes.push(...chunk);
        continue;
      }
    }
    const trimmed = block.trim();
    if (trimmed) {
      nodes.push({
        type: MARKDOWN_PASTE.DEFAULT_PARAGRAPH_TYPE,
        content: [{ type: MARKDOWN_PASTE.DEFAULT_TEXT_TYPE, text: trimmed }],
      });
    }
  }

  return nodes;
}

export function buildMarkdownNodes(raw: string, editor: Editor): JSONContent[] {
  const parser = editor.markdown;
  if (!parser) return [];
  const full = safeParse(parser, raw);
  if (full) {
    const fullNodes = (full.content ?? []).filter((node) => node?.type);
    if (fullNodes.length) return fullNodes;
  }
  return parseMarkdownBlocks(raw, parser);
}

export function shouldTryMarkdown(text: string, parser: Editor['markdown'] | undefined): boolean {
  if (looksLikeMarkdown(text)) return true;
  if (!parser || !text.includes('\n') || text.trim().length < MARKDOWN_PASTE.MIN_FALLBACK_BLOCK_LENGTH) {
    return false;
  }
  const parsed = safeParse(parser, text);
  if (!parsed) return false;
  const blocks = parsed.content ?? [];
  if (blocks.length > 1) return true;
  return blocks.some((node) => node.type && node.type !== MARKDOWN_PASTE.DEFAULT_PARAGRAPH_TYPE);
}

export function blockToPlainText(block: JSONContent): string {
  if (block.type === MARKDOWN_PASTE.DEFAULT_TEXT_TYPE) return block.text ?? '';
  return (block.content ?? []).map(blockToPlainText).join('');
}

export function docToPlainText(doc: JSONContent): string {
  const blocks = doc.content ?? [];
  const lines = blocks.map((block) => blockToPlainText(block)).filter(Boolean);
  if (!lines.length) return '';
  const allParagraphs = blocks.every((block) => !block.type || block.type === MARKDOWN_PASTE.DEFAULT_PARAGRAPH_TYPE);
  if (allParagraphs && lines.length > 1) return lines.join('\n');
  return lines.join('\n\n');
}

const STRUCTURAL_BLOCKS = new Set([
  'heading', 'bulletList', 'orderedList', 'blockquote', 'codeBlock',
  'compareTable', 'keyIdea', 'definition', 'example', 'callout', 'examTrap',
]);

export function docLooksLikeUnparsedMarkdown(doc: JSONContent): boolean {
  const blocks = doc.content ?? [];
  if (!blocks.length) return false;
  if (blocks.some((block) => block.type && STRUCTURAL_BLOCKS.has(block.type))) return false;
  return looksLikeMarkdown(docToPlainText(doc));
}
