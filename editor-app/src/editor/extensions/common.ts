import { mergeAttributes, Node as TipTapNode, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";

type AttrConfig = Record<string, { default: string | boolean | number | string | string[] }>;

function isNodeContentEmpty(node: ProseMirrorNode) {
  let hasContent = false;

  node.descendants((child) => {
    if (child.isText && child.text?.trim()) {
      hasContent = true;
      return false;
    }

    if (child.isLeaf && child.type.name !== "hardBreak") {
      hasContent = true;
      return false;
    }

    return true;
  });

  return !hasContent;
}

function deleteEmptyBlock(editor: Editor, nodeName: string) {
  const { state, view } = editor;
  const { selection } = state;

  if (!selection.empty) return false;

  const { $from } = selection;
  let blockDepth = -1;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === nodeName) {
      blockDepth = depth;
      break;
    }
  }

  if (blockDepth === -1) return false;

  const blockNode = $from.node(blockDepth);
  const textParentIsEmpty = $from.parent.isTextblock && $from.parent.content.size === 0;
  const cursorAtTextStart = $from.parentOffset === 0;

  if ((!textParentIsEmpty || !cursorAtTextStart) && blockNode.content.size > 0) {
    return false;
  }

  if (!isNodeContentEmpty(blockNode)) return false;

  const from = $from.before(blockDepth);
  const to = $from.after(blockDepth);
  const paragraph = state.schema.nodes.paragraph?.create();
  const shouldLeaveParagraph = blockDepth === 1 && state.doc.childCount === 1 && Boolean(paragraph);
  const tr = shouldLeaveParagraph
    ? state.tr.replaceWith(from, to, paragraph!)
    : state.tr.delete(from, to);
  const selectionPos = shouldLeaveParagraph ? from + 1 : Math.min(from, tr.doc.content.size);
  const safePos = Math.max(0, Math.min(selectionPos, tr.doc.content.size));

  tr.setSelection(Selection.near(tr.doc.resolve(safePos), safePos > 0 ? -1 : 1));
  view.dispatch(tr.scrollIntoView());

  return true;
}

export function createBlockExtension(options: {
  name: string;
  label: string;
  className: string;
  attrs?: AttrConfig;
}) {
  return TipTapNode.create({
    name: options.name,
    group: "block",
    content: "block*",
    isolating: true,
    addAttributes() {
      return options.attrs || {};
    },
    parseHTML() {
      return [{ tag: `aside[data-type="${options.name}"]` }];
    },
    renderHTML({ HTMLAttributes }) {
      return [
        "aside",
        mergeAttributes({ "data-type": options.name, class: options.className }, HTMLAttributes),
        0,
      ];
    },
    addKeyboardShortcuts() {
      return {
        Backspace: () => deleteEmptyBlock(this.editor, options.name),
      };
    },
    addNodeView() {
      return ({ node }) => {
        const dom = document.createElement("aside");
        dom.className = options.className;
        dom.dataset.type = options.name;

        const header = document.createElement("div");
        header.className = `${options.className}__header`;

        const label = document.createElement("span");
        label.className = `${options.className}__label`;
        label.textContent = options.label;
        header.appendChild(label);

        if (node.attrs.term) {
          const term = document.createElement("strong");
          term.className = `${options.className}__term`;
          term.textContent = String(node.attrs.term);
          header.appendChild(term);
        }

        if (node.attrs.title) {
          const title = document.createElement("span");
          title.className = `${options.className}__title`;
          title.textContent = String(node.attrs.title);
          header.appendChild(title);
        }

        dom.appendChild(header);

        const content = document.createElement("div");
        content.className = `${options.className}__content`;
        dom.appendChild(content);

        return {
          dom,
          contentDOM: content,
        };
      };
    },
  });
}
