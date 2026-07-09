import type { Editor } from '@tiptap/react';
import { Bold, Heading1, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered, Quote } from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  TOOLBAR_CANVAS_EDGE_GAP,
  TOOLBAR_FALLBACK_HEIGHT,
  TOOLBAR_GAP,
  TOOLBAR_ICON_SIZE,
} from '../../constants/editor.js';
import { TOOLBAR_LABELS } from '../../constants/i18n.js';
import { useFloatingPosition } from '../../hooks/useFloatingPosition.js';

type ToolbarProps = { editor: Editor };

type IconComponent = ComponentType<{ size?: number }>;

type ToolbarItem = {
  id: string;
  label: string;
  icon: IconComponent;
  isActive(editor: Editor): boolean;
  run(editor: Editor): void;
  dividerAfter?: boolean;
};

function getPortalRoot(): HTMLElement {
  return document.getElementById('editor-portal-root')
    ?? document.querySelector('.admin-app')
    ?? document.body;
}

const TOOLBAR_ITEMS: ToolbarItem[] = [
  {
    id: 'bold',
    label: TOOLBAR_LABELS.bold,
    icon: Bold,
    isActive: (editor) => editor.isActive('bold'),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    label: TOOLBAR_LABELS.italic,
    icon: Italic,
    isActive: (editor) => editor.isActive('italic'),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: 'link',
    label: TOOLBAR_LABELS.link,
    icon: LinkIcon,
    isActive: (editor) => editor.isActive('link'),
    run: (editor) => {
      const url = window.prompt(TOOLBAR_LABELS.linkPrompt);
      if (url) editor.chain().focus().setLink({ href: url }).run();
    },
    dividerAfter: true,
  },
  {
    id: 'h1',
    label: TOOLBAR_LABELS.heading1,
    icon: Heading1,
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: TOOLBAR_LABELS.heading2,
    icon: Heading2,
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: TOOLBAR_LABELS.heading3,
    icon: Heading3,
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    dividerAfter: true,
  },
  {
    id: 'bullet',
    label: TOOLBAR_LABELS.bulletList,
    icon: List,
    isActive: (editor) => editor.isActive('bulletList'),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: TOOLBAR_LABELS.orderedList,
    icon: ListOrdered,
    isActive: (editor) => editor.isActive('orderedList'),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'quote',
    label: TOOLBAR_LABELS.blockquote,
    icon: Quote,
    isActive: (editor) => editor.isActive('blockquote'),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
];

export function Toolbar({ editor }: ToolbarProps) {
  const [anchor, setAnchor] = useState<{ left: number; top: number; bottom: number } | null>(null);
  const [container, setContainer] = useState<DOMRect | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const updateAnchor = useCallback(() => {
    const { state, view } = editor;
    const { selection } = state;
    if (selection.empty || !editor.isEditable) {
      setAnchor(null);
      return;
    }
    const canvas = view.dom.closest('.tiptap-editor__canvas');
    if (!(canvas instanceof HTMLElement)) {
      setAnchor(null);
      return;
    }
    try {
      const start = view.coordsAtPos(selection.from);
      const end = view.coordsAtPos(selection.to);
      const canvasRect = canvas.getBoundingClientRect();
      setContainer(canvasRect);
      setAnchor({
        left: (start.left + end.right) / 2,
        top: Math.min(start.top, end.top),
        bottom: Math.max(start.bottom, end.bottom),
      });
    } catch {
      setAnchor(null);
    }
  }, [editor]);

  useEffect(() => {
    editor.on('selectionUpdate', updateAnchor);
    editor.on('transaction', updateAnchor);
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('scroll', updateAnchor, true);
    updateAnchor();
    return () => {
      editor.off('selectionUpdate', updateAnchor);
      editor.off('transaction', updateAnchor);
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('scroll', updateAnchor, true);
    };
  }, [editor, updateAnchor]);

  useLayoutEffect(() => {
    if (!anchor || !toolbarRef.current) return;
    const measure = () => {
      if (!toolbarRef.current) return;
      setSize({
        width: toolbarRef.current.offsetWidth,
        height: toolbarRef.current.offsetHeight,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(toolbarRef.current);
    return () => observer.disconnect();
  }, [anchor]);

  const floating = useFloatingPosition({
    anchor: anchor ? { left: anchor.left, top: anchor.top, bottom: anchor.bottom } : null,
    container,
    measuredHeight: size.height || undefined,
    fallbackHeight: TOOLBAR_FALLBACK_HEIGHT,
    gap: TOOLBAR_GAP,
    edgeGap: TOOLBAR_CANVAS_EDGE_GAP,
    prefer: 'above',
  });

  if (!anchor) return null;

  const toolbar = (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={TOOLBAR_LABELS.toolbarLabel}
      className={`editor-bubble-toolbar editor-bubble-toolbar--${floating.placement}`}
      style={{ left: floating.left, top: floating.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {TOOLBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = item.isActive(editor);
        return (
          <ToolbarButton
            key={item.id}
            item={item}
            icon={Icon}
            active={active}
            onActivate={() => item.run(editor)}
            showDivider={item.dividerAfter}
          />
        );
      })}
    </div>
  );

  return createPortal(toolbar, getPortalRoot());
}

interface ToolbarButtonProps {
  item: ToolbarItem;
  icon: IconComponent;
  active: boolean;
  onActivate(): void;
  showDivider?: boolean;
}

function ToolbarButton({ item, icon: Icon, active, onActivate, showDivider }: ToolbarButtonProps) {
  return (
    <>
      <button
        type="button"
        aria-label={item.label}
        aria-pressed={active}
        data-tip={item.label}
        className={active ? 'active' : ''}
        onClick={onActivate}
      >
        <Icon size={TOOLBAR_ICON_SIZE} />
      </button>
      {showDivider && <span className="editor-bubble-toolbar__divider" aria-hidden="true" />}
    </>
  );
}
