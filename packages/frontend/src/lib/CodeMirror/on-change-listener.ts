import { EditorView } from "codemirror";
import { getBounds, puzzleFacet } from "./readonly-puzzle";
import type { Extension } from "@codemirror/state";

export const onChangeHandler = (
  onChange: (solution: string) => void,
): Extension =>
  EditorView.updateListener.of(({ docChanged, state }) => {
    if (!docChanged) return;

    const { from: fromBound, to: toBound } = getBounds(
      state.facet(puzzleFacet).getState(),
      state.doc.length,
    );

    const solution = state.doc.sliceString(fromBound, toBound);
    onChange(solution);
  });
