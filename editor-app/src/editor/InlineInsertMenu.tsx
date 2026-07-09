import type { Editor } from '@tiptap/react';
import {
  AlertTriangle, BookOpen, Brain, Heading2, Lightbulb, ListPlus,
  Pilcrow, Plus, Sparkles, Table,
} from 'lucide-react';
import type { ComponentType } from 'react';
import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import {
  INLINE_MENU_ANCHOR_THRESHOLD_GAP_AFTER,
  INLINE_MENU_ANCHOR_THRESHOLD_GAP_BEFORE,
  INLINE_MENU_ANCHOR_THRESHOLD_MIDDLE_HALF_GAP,
  INLINE_MENU_ANCHOR_THRESHOLD_MIDDLE_MAX,
  INLINE_MENU_BREAKPOINTS,
  INLINE_MENU_GAP,
  INLINE_MENU_HEIGHTS,
} from '../constants/editor.js';
import {
  BLOCK_DEFAULT_TITLES, BLOCK_INSERT_LABELS, BLOCK_PROMPT_LABELS, EDITOR_LABELS,
} from '../constants/i18n.js';
import { useFloatingPosition } from '../hooks/useFloatingPosition.js';

type InsertOption = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  build: () => Record<string, unknown> | null;
};

type InsertAnchor = { top: number; pos: number };

type InlineInsertMenuProps = { editor: Editor };

function promptValue(label: string, fallback: string): string | null {
  const value = window.prompt(label, fallback);
  if (value === null) return null;
  return value.trim() || fallback;
}

function insertAt(editor: Editor, pos: number, content: Record<string, unknown>): void {
  editor.chain().focus().insertContentAt(pos, content, { updateSelection: true }).run();
}

function blockPositionAtIndex(editor: Editor, index: number): number {
  let pos = 0;
  for (let i = 0; i <= index; i += 1) {
    pos += editor.state.doc.child(i).nodeSize;
  }
  return pos;
}

function getTopLevelBlocks(editor: Editor): HTMLElement[] {
  return Array.from(editor.view.dom.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
}

function isEmptyDocument(editor: Editor): boolean {
  const { doc } = editor.state;
  if (doc.childCount === 0) return true;
  if (doc.childCount === 1) {
    const node = doc.firstChild;
    return node?.type.name === 'paragraph' && node.content.size === 0;
  }
  return false;
}

function getInlineMenuHeight(): number {
  if (window.matchMedia(`(max-width: ${INLINE_MENU_BREAKPOINTS.mobile}px)`).matches) {
    return INLINE_MENU_HEIGHTS.mobile;
  }
  if (window.matchMedia(`(max-width: ${INLINE_MENU_BREAKPOINTS.tablet}px)`).matches) {
    return INLINE_MENU_HEIGHTS.tablet;
  }
  return INLINE_MENU_HEIGHTS.desktop;
}

export function InlineInsertMenu({ editor }: InlineInsertMenuProps) {
  const [anchor, setAnchor] = useState<InsertAnchor | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuSize, setMenuSize] = useState({ height: 0 });

  const options = useMemo<InsertOption[]>(() => [
    { id: 'paragraph', label: BLOCK_INSERT_LABELS.paragraph, icon: Pilcrow,
      build: () => ({ type: 'paragraph' }) },
    { id: 'heading', label: BLOCK_INSERT_LABELS.heading, icon: Heading2,
      build: () => ({ type: 'heading', attrs: { level: 2 } }) },
    { id: 'bulletList', label: BLOCK_INSERT_LABELS.bulletList, icon: ListPlus,
      build: () => ({ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] }) },
    { id: 'keyIdea', label: BLOCK_INSERT_LABELS.keyIdea, icon: Sparkles,
      build: () => ({ type: 'keyIdea', content: [{ type: 'paragraph' }] }) },
    { id: 'definition', label: BLOCK_INSERT_LABELS.definition, icon: BookOpen,
      build: () => {
        const term = promptValue(BLOCK_PROMPT_LABELS.definitionTerm, '');
        if (term === null) return null;
        return { type: 'definition', attrs: { term }, content: [{ type: 'paragraph' }] };
      } },
    { id: 'example', label: BLOCK_INSERT_LABELS.example, icon: Brain,
      build: () => {
        const title = promptValue(BLOCK_PROMPT_LABELS.exampleTitle, BLOCK_DEFAULT_TITLES.example);
        if (title === null) return null;
        return { type: 'example', attrs: { title }, content: [{ type: 'paragraph' }] };
      } },
    { id: 'callout', label: BLOCK_INSERT_LABELS.callout, icon: Lightbulb,
      build: () => {
        const title = promptValue(BLOCK_PROMPT_LABELS.calloutTitle, BLOCK_DEFAULT_TITLES.callout);
        if (title === null) return null;
        return { type: 'callout', attrs: { title }, content: [{ type: 'paragraph' }] };
      } },
    { id: 'examTrap', label: BLOCK_INSERT_LABELS.examTrap, icon: AlertTriangle,
      build: () => ({ type: 'examTrap', content: [{ type: 'paragraph' }] }) },
    { id: 'compareTable', label: BLOCK_INSERT_LABELS.compareTable, icon: Table,
      build: () => ({ type: 'compareTable', attrs: { caption: '', columns: ['', ''], rows: [['', ''], ['', '']] } }) },
  ], []);

  const getCanvas = useCallback(() => {
    const canvas = editor.view.dom.closest('.tiptap-editor__canvas');
    return canvas instanceof HTMLElement ? canvas : null;
  }, [editor]);

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const updateAnchor = (event: MouseEvent) => {
      if (menuOpen || isEmptyDocument(editor)) return;
      const blocks = getTopLevelBlocks(editor);
      if (blocks.length === 0) return;
      const canvasRect = canvas.getBoundingClientRect();
      const mouseY = event.clientY;
      for (let index = 0; index < blocks.length; index += 1) {
        const currentRect = blocks[index]!.getBoundingClientRect();
        const nextRect = blocks[index + 1]?.getBoundingClientRect();
        const lower = currentRect.bottom;
        const upper = nextRect ? nextRect.top : currentRect.bottom + 34;
        const middle = (lower + upper) / 2;
        const inGap = mouseY >= lower - INLINE_MENU_ANCHOR_THRESHOLD_GAP_BEFORE
          && mouseY <= upper + INLINE_MENU_ANCHOR_THRESHOLD_GAP_AFTER;
        if (inGap && Math.abs(mouseY - middle) <= Math.max(
          INLINE_MENU_ANCHOR_THRESHOLD_MIDDLE_MAX,
          (upper - lower) / 2 + INLINE_MENU_ANCHOR_THRESHOLD_MIDDLE_HALF_GAP,
        )) {
          setAnchor({
            top: middle - canvasRect.top,
            pos: index < editor.state.doc.childCount
              ? blockPositionAtIndex(editor, index)
              : editor.state.doc.content.size,
          });
          return;
        }
      }
      setAnchor(null);
    };
    const clearAnchor = () => {
      if (!menuOpen) setAnchor(null);
    };
    canvas.addEventListener('mousemove', updateAnchor);
    canvas.addEventListener('mouseleave', clearAnchor);
    return () => {
      canvas.removeEventListener('mousemove', updateAnchor);
      canvas.removeEventListener('mouseleave', clearAnchor);
    };
  }, [editor, getCanvas, menuOpen]);

  const canvasRect = useMemo(() => {
    const canvas = getCanvas();
    return canvas ? canvas.getBoundingClientRect() : null;
  }, [getCanvas, anchor]);

  const paneRect = useMemo(() => {
    const canvas = getCanvas();
    const pane = canvas?.closest('.admin-editor-pane');
    return pane instanceof HTMLElement ? pane.getBoundingClientRect() : null;
  }, [getCanvas]);

  const anchorForFloating = useMemo(() => {
    if (!anchor || !canvasRect) return null;
    return {
      left: canvasRect.left + canvasRect.width / 2,
      top: canvasRect.top + anchor.top,
      bottom: canvasRect.top + anchor.top + 1,
    };
  }, [anchor, canvasRect]);

  useLayoutEffect(() => {
    if (!menuOpen || !menuRef.current) return;
    setMenuSize({ height: menuRef.current.offsetHeight });
  }, [menuOpen]);

  const floating = useFloatingPosition({
    anchor: anchorForFloating,
    container: canvasRect,
    pane: paneRect,
    measuredHeight: menuSize.height || getInlineMenuHeight(),
    gap: INLINE_MENU_GAP,
    prefer: 'below',
  });

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.inline-insert')) return;
      setMenuOpen(false);
      setAnchor(null);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  if (!anchor) return null;

  const triggerTop = canvasRect ? anchor.top - 8 : anchor.top;

  return (
    <div className="inline-insert" style={{ top: triggerTop }}>
      <span className="inline-insert__line" aria-hidden="true" />
      <button
        type="button"
        className="inline-insert__button"
        aria-label={EDITOR_LABELS.addBlock}
        data-tip={EDITOR_LABELS.addBlock}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Plus size={16} />
      </button>
      <span className="inline-insert__line" aria-hidden="true" />

      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          className={`inline-insert__menu inline-insert__menu--${floating.placement}`}
          style={{ left: floating.left, top: floating.top }}
        >
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const content = option.build();
                  if (!content) return;
                  insertAt(editor, anchor.pos, content);
                  setMenuOpen(false);
                  setAnchor(null);
                }}
              >
                <Icon size={16} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
