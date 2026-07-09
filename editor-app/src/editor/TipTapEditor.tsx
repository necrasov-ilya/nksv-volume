import { useEditor, EditorContent } from '@tiptap/react';
import { useCallback, useEffect, useMemo } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Markdown } from '@tiptap/markdown';
import { DEFAULT_MARKDOWN_OPTIONS, EDITOR_PLACEHOLDER } from '../constants/editor.js';
import { EDITOR_LABELS } from '../constants/i18n.js';
import { fromTipTapDocument, toTipTapDocument } from '../utils/articleContent.js';
import {
  Callout, CompareTable, Definition, Example, ExamTrap, KeyIdea, MarkdownPaste,
  normalizeRawMarkdownDoc,
} from './extensions/index.js';
import { Toolbar } from './ui/Toolbar.js';
import { InlineInsertMenu } from './InlineInsertMenu.js';
import type { Block } from '../types.js';

type TipTapEditorProps = {
  initialContent: Block;
  onChange: (content: Block) => void;
};

export function TipTapEditor({ initialContent, onChange }: TipTapEditorProps) {
  const extensions = useMemo(() => [
    StarterKit.configure({ hardBreak: false }),
    HardBreak,
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: EDITOR_PLACEHOLDER }),
    KeyIdea,
    Definition,
    Example,
    Callout,
    ExamTrap,
    CompareTable,
    Markdown.configure({ markedOptions: DEFAULT_MARKDOWN_OPTIONS }),
    MarkdownPaste,
  ], []);

  const handleChange = useCallback((editorInstance: { getJSON: () => Record<string, unknown> }) => {
    onChange(fromTipTapDocument(editorInstance.getJSON()));
  }, [onChange]);

  const editor = useEditor({
    extensions,
    content: toTipTapDocument(initialContent),
    onUpdate: ({ editor: ed }) => handleChange(ed),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    const normalized = normalizeRawMarkdownDoc(
      { type: 'doc', content: ((current.content ?? []) as Block[]) },
      editor,
    );
    if (normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [editor]);

  if (!editor) return <div className="editor-loading">{EDITOR_LABELS.loading}</div>;

  return (
    <div className="tiptap-editor">
      <div className="tiptap-editor__canvas">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} className="tiptap-editor__content" />
        <InlineInsertMenu editor={editor} />
      </div>
    </div>
  );
}
