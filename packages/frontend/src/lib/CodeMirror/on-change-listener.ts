import { EditorView } from "codemirror";
import { getBounds, puzzleFacet } from "./readonly-puzzle";
import type { Extension } from "@codemirror/state";

export const onChangeHandler = (
  onChange: (solution: string) => void,
): Extension =>
  EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;

    const { from: fromBound, to: toBound } = getBounds(
      update.state.facet(puzzleFacet),
      update.state.doc.length,
    );

    const solution = update.state.doc.sliceString(fromBound, toBound);
    onChange(solution);
  });
