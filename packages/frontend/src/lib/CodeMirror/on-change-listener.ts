import { EditorView } from "codemirror";
import { getSolution } from "./readonly-puzzle";
import type { EditorSelection, Extension } from "@codemirror/state";

export type OnChangeCb = (solution: string, selection: EditorSelection) => void;

export const onChangeHandler = (onChange: OnChangeCb): Extension =>
  EditorView.updateListener.of(({ docChanged, state }) => {
    if (!docChanged) return;
    onChange(getSolution(state), state.selection);
  });
