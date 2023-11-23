import { EditorView } from "codemirror";
import { getSolution } from "./readonly-puzzle";
import type { Extension } from "@codemirror/state";

export type OnChangeCb = (solution: string) => void;

export const onChangeHandler = (onChange: OnChangeCb): Extension =>
  EditorView.updateListener.of(({ docChanged, state }) => {
    if (!docChanged) return;
    onChange(getSolution(state));
  });
