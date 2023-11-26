import { persisted } from "svelte-persisted-store";
import type { CodeMirrorOptions } from "./CodeMirror";

export const defaultEditorSettings: CodeMirrorOptions = {
  indentSize: 2,
  cursorLineMargin: 2,
};

export const editorSettings = persisted<CodeMirrorOptions>(
  "editorSettings",
  defaultEditorSettings,
);
