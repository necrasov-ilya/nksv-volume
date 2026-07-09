import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CompareTableComponent } from "../CompareTableComponent";

export const CompareTable = Node.create({
  name: "compareTable",
  group: "block",
  content: "",
  isolating: true,
  addAttributes() {
    return {
      caption: { default: "" },
      columns: { default: [] as string[] },
      rows: { default: [] as string[][] },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-type=\"compareTable\"]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes({ "data-type": "compareTable", class: "editor-compare-table" }, HTMLAttributes),
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CompareTableComponent);
  },
});
