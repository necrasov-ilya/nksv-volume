import type { Editor } from "@tiptap/react";
import { Bold, Heading1, Heading2, Heading3, Italic, Link, List, ListOrdered, Quote } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type ToolbarProps = {
  editor: Editor;
};

type ToolbarPlacement = "above" | "below";

type ToolbarAnchor = {
  left: number;
  top: number;
  bottom: number;
  canvasWidth: number;
  canvasHeight: number;
  placement: ToolbarPlacement;
};

const TOOLBAR_GAP = 10;
const CANVAS_EDGE_GAP = 12;

export function Toolbar({ editor }: ToolbarProps) {
  const [anchor, setAnchor] = useState<ToolbarAnchor | null>(null);
  const [toolbarWidth, setToolbarWidth] = useState(0);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const choosePlacement = (
    top: number,
    bottom: number,
    canvasHeight: number,
    measuredHeight: number,
  ): ToolbarPlacement => {
    const height = measuredHeight || 44;
    const spaceAbove = top;
    const spaceBelow = canvasHeight - bottom;
    const need = height + TOOLBAR_GAP;

    if (spaceAbove < need && spaceBelow >= need) return "below";
    if (spaceBelow < need && spaceAbove > spaceBelow) return "above";
    return spaceAbove >= need ? "above" : "below";
  };

  useEffect(() => {
    const updateAnchor = () => {
      const { state, view } = editor;
      const { selection } = state;

      if (selection.empty || !editor.isEditable) {
        setAnchor(null);
        return;
      }

      const canvas = view.dom.closest(".tiptap-editor__canvas");
      if (!(canvas instanceof HTMLElement)) {
        setAnchor(null);
        return;
      }

      try {
        const start = view.coordsAtPos(selection.from);
        const end = view.coordsAtPos(selection.to);
        const canvasRect = canvas.getBoundingClientRect();
        const left = (start.left + end.right) / 2 - canvasRect.left;
        const top = Math.min(start.top, end.top) - canvasRect.top;
        const bottom = Math.max(start.bottom, end.bottom) - canvasRect.top;

        setAnchor({
          left: Math.max(CANVAS_EDGE_GAP, Math.min(left, canvasRect.width - CANVAS_EDGE_GAP)),
          top,
          bottom,
          canvasWidth: canvasRect.width,
          canvasHeight: canvasRect.height,
          placement: choosePlacement(top, bottom, canvasRect.height, toolbarHeight),
        });
      } catch {
        setAnchor(null);
      }
    };

    editor.on("selectionUpdate", updateAnchor);
    editor.on("transaction", updateAnchor);
    window.addEventListener("resize", updateAnchor);
    updateAnchor();

    return () => {
      editor.off("selectionUpdate", updateAnchor);
      editor.off("transaction", updateAnchor);
      window.removeEventListener("resize", updateAnchor);
    };
  }, [editor, toolbarHeight]);

  const resolvedLeft = useMemo(() => {
    if (!anchor) return 0;
    if (!toolbarWidth) return anchor.left;

    const halfWidth = toolbarWidth / 2;
    const minLeft = halfWidth + CANVAS_EDGE_GAP;
    const maxLeft = anchor.canvasWidth - halfWidth - CANVAS_EDGE_GAP;

    if (maxLeft < minLeft) {
      return anchor.canvasWidth / 2;
    }

    return Math.max(minLeft, Math.min(anchor.left, maxLeft));
  }, [anchor, toolbarWidth]);

  const resolvedPlacement = useMemo(() => {
    if (!anchor) return "above" as ToolbarPlacement;
    return choosePlacement(anchor.top, anchor.bottom, anchor.canvasHeight, toolbarHeight);
  }, [anchor, toolbarHeight]);

  useLayoutEffect(() => {
    if (!anchor || !toolbarRef.current) return;

    const updateSize = () => {
      if (!toolbarRef.current) return;
      setToolbarWidth(toolbarRef.current.offsetWidth);
      setToolbarHeight(toolbarRef.current.offsetHeight);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(toolbarRef.current);

    return () => observer.disconnect();
  }, [anchor]);

  if (!anchor) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs);

  return (
    <div
      ref={toolbarRef}
      className={`editor-bubble-toolbar editor-bubble-toolbar--${resolvedPlacement}`}
      style={{
        left: resolvedLeft,
        top: resolvedPlacement === "above" ? anchor.top : anchor.bottom,
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        aria-label="Жирный"
        data-tip="Жирный"
        className={isActive("bold") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={15} />
      </button>
      <button
        type="button"
        aria-label="Курсив"
        data-tip="Курсив"
        className={isActive("italic") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={15} />
      </button>
      <button
        type="button"
        aria-label="Ссылка"
        data-tip="Ссылка"
        className={isActive("link") ? "active" : ""}
        onClick={() => {
          const url = window.prompt("URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
      >
        <Link size={15} />
      </button>
      <span className="editor-bubble-toolbar__divider" aria-hidden="true" />
      <button
        type="button"
        aria-label="Заголовок 1"
        data-tip="Заголовок 1"
        className={isActive("heading", { level: 1 }) ? "active" : ""}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={15} />
      </button>
      <button
        type="button"
        aria-label="Заголовок 2"
        data-tip="Заголовок 2"
        className={isActive("heading", { level: 2 }) ? "active" : ""}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={15} />
      </button>
      <button
        type="button"
        aria-label="Заголовок 3"
        data-tip="Заголовок 3"
        className={isActive("heading", { level: 3 }) ? "active" : ""}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={15} />
      </button>
      <span className="editor-bubble-toolbar__divider" aria-hidden="true" />
      <button
        type="button"
        aria-label="Маркированный список"
        data-tip="Маркированный список"
        className={isActive("bulletList") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={15} />
      </button>
      <button
        type="button"
        aria-label="Нумерованный список"
        data-tip="Нумерованный список"
        className={isActive("orderedList") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={15} />
      </button>
      <button
        type="button"
        aria-label="Цитата"
        data-tip="Цитата"
        className={isActive("blockquote") ? "active" : ""}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote size={15} />
      </button>
    </div>
  );
}