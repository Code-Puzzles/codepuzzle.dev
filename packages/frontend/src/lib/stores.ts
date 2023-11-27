import { persisted } from "svelte-persisted-store";
import type { CodeMirrorOptions } from "./CodeMirror";
import type { EditorSelection } from "@codemirror/state";

export const defaultEditorSettings: () => CodeMirrorOptions = () => ({
  indentSize: 2,
  cursorLineMargin: 2,
});

export const editorSettings = persisted<CodeMirrorOptions>(
  "editorSettings",
  defaultEditorSettings(),
);

export interface Draft {
  solution: string;
  selection: EditorSelection;
}
export type Drafts = Record<string, Draft | undefined>;
/**
 * Map of `puzzleId` -> `draft text`
 */
export const drafts = persisted<Drafts>("drafts", {});
