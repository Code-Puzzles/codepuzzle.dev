import { javascript } from "@codemirror/lang-javascript";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { scrollPastEnd } from "@codemirror/view";
import { type Highlighter, tags } from "@lezer/highlight";
import { EditorView } from "codemirror";
import { cursorScrollMargin } from "./cursor-scroll-margin";

import "./display.postcss";
export const displayExtension = (view: EditorView): Extension => [
  // fixed height editor, which scrolls vertically
  EditorView.theme({
    "&": { height: "100%" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { overflow: "auto" },
  }),
  // wrap long horizontal lines
  EditorView.lineWrapping,
  cursorScrollMargin(view),
  // allow scrolling past the end of the last line in the editor
  scrollPastEnd(),
  // theme
  syntaxHighlighting(
    <Highlighter>HighlightStyle.define([
      { tag: tags.atom, class: "cmt-atom" },
      { tag: tags.comment, class: "cmt-comment" },
      { tag: tags.keyword, class: "cmt-keyword" },
      { tag: tags.literal, class: "cmt-literal" },
      { tag: tags.number, class: "cmt-number" },
      { tag: tags.operator, class: "cmt-operator" },
      { tag: tags.separator, class: "cmt-separator" },
      { tag: tags.string, class: "cmt-string" },
    ]),
  ),
  // syntax highlighting
  javascript(),
];
