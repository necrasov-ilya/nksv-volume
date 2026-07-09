import { Extension, type Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { MARKDOWN_PASTE, MARKDOWN_PASTE_PRIORITY } from '../../constants/editor.js';
import {
  buildMarkdownNodes,
  docLooksLikeUnparsedMarkdown,
  docToPlainText,
  shouldTryMarkdown,
} from '../../utils/markdown.js';

function dispatchNodes(view: EditorView, from: number, to: number, nodes: JSONContent[]): boolean {
  if (!nodes.length) return false;
  try {
    const fragment = Fragment.from(
      nodes.map((node) => view.state.schema.nodeFromJSON(node)),
    );
    view.dispatch(view.state.tr.replaceWith(from, to, fragment));
    return true;
  } catch {
    return false;
  }
}

function insertMarkdown(view: EditorView, editor: Editor, from: number, to: number, raw: string): boolean {
  if (dispatchNodes(view, from, to, buildMarkdownNodes(raw, editor))) return true;
  if (editor.commands.insertContentAt({ from, to }, raw, { contentType: MARKDOWN_PASTE.CONTENT_TYPE_MARKDOWN })) {
    return true;
  }
  return dispatchNodes(
    view,
    from,
    to,
    raw.split(MARKDOWN_PASTE.BLOCK_SEPARATOR).map((block) => ({
      type: MARKDOWN_PASTE.DEFAULT_PARAGRAPH_TYPE,
      content: block.trim() ? [{ type: MARKDOWN_PASTE.DEFAULT_TEXT_TYPE, text: block.trim() }] : [],
    })),
  );
}

export function normalizeRawMarkdownDoc(doc: JSONContent, editor: Editor): JSONContent | null {
  if (!docLooksLikeUnparsedMarkdown(doc)) return null;
  const nodes = buildMarkdownNodes(docToPlainText(doc), editor);
  return nodes.length ? { type: MARKDOWN_PASTE.DEFAULT_DOC_TYPE, content: nodes } : null;
}

export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',
  priority: MARKDOWN_PASTE_PRIORITY,
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste: (view, event) => {
            const text = (event.clipboardData?.getData('text/plain') ?? '').replace(MARKDOWN_PASTE.CRLF_PATTERN, '\n');
            if (!text.trim() || !editor.markdown || !shouldTryMarkdown(text, editor.markdown)) {
              return false;
            }
            const { from, to } = view.state.selection;
            if (!insertMarkdown(view, editor, from, to, text)) return false;
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});
