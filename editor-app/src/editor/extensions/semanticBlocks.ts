import { createBlockExtension } from "./common";

export const KeyIdea = createBlockExtension({
  name: "keyIdea",
  label: "Ключевая мысль",
  className: "editor-key-idea",
});

export const Definition = createBlockExtension({
  name: "definition",
  label: "Определение",
  className: "editor-definition",
  attrs: {
    term: { default: "" },
  },
});

export const Example = createBlockExtension({
  name: "example",
  label: "Пример",
  className: "editor-example",
  attrs: {
    title: { default: "Пример" },
  },
});

export const Callout = createBlockExtension({
  name: "callout",
  label: "Важно",
  className: "editor-callout",
  attrs: {
    title: { default: "Важно" },
  },
});

export const ExamTrap = createBlockExtension({
  name: "examTrap",
  label: "Ловушка формулировки",
  className: "editor-exam-trap",
});
