import type { Editor } from "@tiptap/react";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Heading2,
  Lightbulb,
  ListPlus,
  Pilcrow,
  Plus,
  Sparkles,
  Table,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";

type InsertOption = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  build: () => Record<string, unknown> | null;
};

type InsertAnchor = {
  top: number;
  pos: number;
};

type InlineInsertMenuProps = {
  editor: Editor;
};

const MENU_GAP = 12;

function promptValue(label: string, fallback: string) {
  const value = window.prompt(label, fallback);
  if (value === null) return null;
  return value.trim() || fallback;
}

function insertAt(editor: Editor, pos: number, content: Record<string, unknown>) {
  editor
    .chain()
    .focus()
    .insertContentAt(pos, content, { updateSelection: true })
    .run();
}

function blockPositionAtIndex(editor: Editor, index: number) {
  let pos = 0;
  for (let i = 0; i <= index; i += 1) {
    pos += editor.state.doc.child(i).nodeSize;
  }
  return pos;
}

function getTopLevelBlocks(editor: Editor) {
  return Array.from(editor.view.dom.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
}

function isEmptyDocument(editor: Editor): boolean {
  const { doc } = editor.state;
  if (doc.childCount === 0) return true;
  if (doc.childCount === 1) {
    const node = doc.firstChild;
    return node?.type.name === "paragraph" && node.content.size === 0;
  }
  return false;
}

export function InlineInsertMenu({ editor }: InlineInsertMenuProps) {
  const [anchor, setAnchor] = useState<InsertAnchor | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<"below" | "above">("below");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo<InsertOption[]>(
    () => [
      {
        id: "paragraph",
        label: "Абзац",
        icon: Pilcrow,
        build: () => ({ type: "paragraph" }),
      },
      {
        id: "heading",
        label: "Заголовок",
        icon: Heading2,
        build: () => ({ type: "heading", attrs: { level: 2 } }),
      },
      {
        id: "bulletList",
        label: "Список",
        icon: ListPlus,
        build: () => ({
          type: "bulletList",
          content: [{ type: "listItem", content: [{ type: "paragraph" }] }],
        }),
      },
      {
        id: "keyIdea",
        label: "Ключевая мысль",
        icon: Sparkles,
        build: () => ({ type: "keyIdea", content: [{ type: "paragraph" }] }),
      },
      {
        id: "definition",
        label: "Определение",
        icon: BookOpen,
        build: () => {
          const term = promptValue("Термин", "");
          if (term === null) return null;
          return { type: "definition", attrs: { term }, content: [{ type: "paragraph" }] };
        },
      },
      {
        id: "example",
        label: "Пример",
        icon: Brain,
        build: () => {
          const title = promptValue("Название примера", "Пример");
          if (title === null) return null;
          return { type: "example", attrs: { title }, content: [{ type: "paragraph" }] };
        },
      },
      {
        id: "callout",
        label: "Callout",
        icon: Lightbulb,
        build: () => {
          const title = promptValue("Название блока", "Важно");
          if (title === null) return null;
          return { type: "callout", attrs: { title }, content: [{ type: "paragraph" }] };
        },
      },
      {
        id: "examTrap",
        label: "Ловушка",
        icon: AlertTriangle,
        build: () => ({ type: "examTrap", content: [{ type: "paragraph" }] }),
      },
      {
        id: "compareTable",
        label: "Таблица",
        icon: Table,
        build: () => ({
          type: "compareTable",
          attrs: {
            caption: "",
            columns: ["", ""],
            rows: [
              ["", ""],
              ["", ""],
            ],
          },
        }),
      },
    ],
    [],
  );

  const getCanvas = useCallback(() => {
    const canvas = editor.view.dom.closest(".tiptap-editor__canvas");
    return canvas instanceof HTMLElement ? canvas : null;
  }, [editor]);

  const chooseMenuPlacement = useCallback(
    (nextAnchor: InsertAnchor, measuredHeight?: number) => {
      const canvas = getCanvas();
      if (!canvas) return "below";

      const canvasRect = canvas.getBoundingClientRect();
      const paneRect = canvas.closest(".admin-editor-pane")?.getBoundingClientRect();
      const anchorY = canvasRect.top + nextAnchor.top;
      const clippingBottom = Math.min(window.innerHeight, paneRect?.bottom ?? window.innerHeight);
      const clippingTop = Math.max(0, paneRect?.top ?? 0);
      const menuHeight =
        measuredHeight ??
        (window.matchMedia("(max-width: 560px)").matches
          ? 430
          : window.matchMedia("(max-width: 820px)").matches
            ? 250
            : 164);
      const spaceBelow = clippingBottom - anchorY - MENU_GAP;
      const spaceAbove = anchorY - clippingTop - MENU_GAP;

      return spaceBelow < menuHeight && spaceAbove > spaceBelow ? "above" : "below";
    },
    [getCanvas],
  );

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
        const currentRect = blocks[index].getBoundingClientRect();
        const nextRect = blocks[index + 1]?.getBoundingClientRect();
        const lower = currentRect.bottom;
        const upper = nextRect ? nextRect.top : currentRect.bottom + 34;
        const middle = (lower + upper) / 2;
        const inGap = mouseY >= lower - 8 && mouseY <= upper + 8;

        if (inGap && Math.abs(mouseY - middle) <= Math.max(14, (upper - lower) / 2 + 8)) {
          setAnchor({
            top: middle - canvasRect.top,
            pos:
              index < editor.state.doc.childCount
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

    canvas.addEventListener("mousemove", updateAnchor);
    canvas.addEventListener("mouseleave", clearAnchor);

    return () => {
      canvas.removeEventListener("mousemove", updateAnchor);
      canvas.removeEventListener("mouseleave", clearAnchor);
    };
  }, [editor, getCanvas, menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen || !anchor || !menuRef.current) return;

    const nextPlacement = chooseMenuPlacement(anchor, menuRef.current.offsetHeight);
    setMenuPlacement((current) => (current === nextPlacement ? current : nextPlacement));
  }, [anchor, chooseMenuPlacement, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const close = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".inline-insert")) return;
      setMenuOpen(false);
      setAnchor(null);
    };

    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  if (!anchor) return null;

  return (
    <div className="inline-insert" style={{ top: anchor.top }}>
      <span className="inline-insert__line" aria-hidden="true" />
      <button
        type="button"
        className="inline-insert__button"
        aria-label="Добавить блок"
        data-tip="Добавить блок"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setMenuOpen((open) => {
            const nextOpen = !open;
            if (nextOpen && anchor) {
              setMenuPlacement(chooseMenuPlacement(anchor));
            }
            return nextOpen;
          });
        }}
      >
        <Plus size={16} />
      </button>
      <span className="inline-insert__line" aria-hidden="true" />

      {menuOpen && (
        <div
          ref={menuRef}
          className={`inline-insert__menu inline-insert__menu--${menuPlacement}`}
        >
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
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