import { indentUnit } from "@codemirror/language";
import {
  EditorSelection,
  EditorState,
  Facet,
  StateField,
  Text,
  Transaction,
  type Extension,
  type TransactionSpec,
} from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import type { Puzzle } from "@jspuzzles/common";

export interface SimpleRange {
  from: number;
  to: number;
}

/**
 * Internal state for a puzzle within CodeMirror
 */
export interface PuzzleState {
  prefix: string;
  suffix: string;
  iifeRanges: SimpleRange[];
}

/**
 * Given a puzzle, returns the required state for this CodeMirror extension.
 */
function puzzleState(puzzle: Puzzle, indentSize: number): PuzzleState {
  const indent = " ".repeat(indentSize);
  const intro = `// This is your function...\n\n`;
  const iifePrefix = `var ${puzzle.name} = (function () {\n`;
  const iifeSuffix = `\n${indent}return ${puzzle.name};\n})();\n`;
  const fn = puzzle.source
    .split("\n")
    .map((line) => indent + line)
    .join("\n");
  const fnCall = `\n// ... now make it return \`true\`!\n${puzzle.name}(`;
  const prefix = [intro, iifePrefix, fn, iifeSuffix, fnCall].join("");

  const start: SimpleRange = {
    from: intro.length,
    to: intro.length + iifePrefix.length,
  };
  const iifeEnd: SimpleRange = {
    from: start.to + fn.length,
    to: start.to + fn.length + iifeSuffix.length,
  };

  return {
    prefix,
    suffix: `);\n`,
    iifeRanges: [start, iifeEnd],
  };
}

export interface PuzzleMethods {
  getState: () => PuzzleState;
}

/**
 * This facet is a way to share the `PuzzleState` within different parts of
 * CodeMirror (e.g., `StateField`s or `EditorView.updateListener` extensions).
 */
export const puzzleFacet = Facet.define<PuzzleState, PuzzleMethods>({
  // CodeMirror will call this with an empty array at the start, as a way to ask
  // for a default value. We don't want a default value, so we just wrap this in
  // a function and throw if anyone tries to use it without passing a state.
  combine: ([state]) => ({
    getState: () => {
      if (state) return state;
      throw new Error("No input provided to the puzzle facet!");
    },
  }),
});

/*
 * StateField
 */

/**
 * This mark defines the CSS class that will be applied to ranges of text that
 * mark the iife that wraps the puzzle.
 */
const iifeMark = Decoration.mark({ class: "cm-iife" });

/**
 * This StateField marks the iife when it's created, and then continually keeps
 * those ranges up to date, even if the editor content is changed.
 *
 * Since this extension marks these parts of the editor as readonly, this will
 * technically never need to update the decorations. But, this is what we must
 * do to properly integrate decorations with CodeMirror 6.
 */
const iifeField = StateField.define<DecorationSet>({
  create: (state) =>
    Decoration.set(
      state
        .facet(puzzleFacet)
        .getState()
        .iifeRanges.map(({ from, to }) => iifeMark.range(from, to)),
    ),
  update: (decorations, tr) => decorations.map(tr.changes),
  provide: (f) => EditorView.decorations.from(f),
});

/*
 * Extension
 */

export interface PuzzleReadOnlyExtension {
  selection: EditorSelection;
  doc: string;
  extension: Extension;
}

/**
 * Extension to only allow edits between certain ranges.
 * https://discuss.codemirror.net/t/migrating-readonly-textmarkers-from-codemirror-5-to-6/7337/5
 */
export const puzzleReadOnlyExtension = (
  puzzle: Puzzle,
  indentSize: number,
  initialValue?: string,
): PuzzleReadOnlyExtension => {
  const p = puzzleState(puzzle, indentSize);
  return {
    // initial value for the puzzle
    doc: [p.prefix, initialValue, p.suffix].filter((s) => s).join(""),
    // initial position for the cursor
    selection: EditorSelection.single(p.prefix.length),
    // list of extensions that make up the readonly extension
    extension: [
      // configure indent and tab size for the editor
      indentUnit.of(" ".repeat(indentSize)),
      EditorState.tabSize.of(indentSize),
      // this state field manages the iife decorations
      iifeField,
      // this facet let's other parts of CodeMirror access the puzzle state
      puzzleFacet.of(p),
      // this extension makes everything readonly
      EditorState.transactionFilter.of(
        (tr: Transaction): TransactionSpec | readonly TransactionSpec[] => {
          // allow all undo/redo transactions, since the transactions that created them
          // should already have been processed by us
          // https://discuss.codemirror.net/t/detect-if-transaction-is-an-undo-redo-event/7421
          if (tr.isUserEvent("undo") || tr.isUserEvent("redo")) {
            return <TransactionSpec>tr;
          }

          // get the bounds after this transaction would be applied
          const bounds = getBounds(p, tr.newDoc.length);

          // iterate over the changes this transaction applies to check if any of the
          // changes are out of bounds
          let oob = false;
          const trChanges: (SimpleRange & { inserted: Text })[] = [];
          tr.changes.iterChanges((startFrom, startTo, from, to, inserted) => {
            // check changes would be out of bounds in new document
            oob = oob || from < bounds.from || to > bounds.to + inserted.length;
            // save initial positions of all changes
            trChanges.push({ from: startFrom, to: startTo, inserted });
          });

          // if there were changes that were out of bounds
          if (oob) {
            // get the bounds before this transaction
            const startBounds = getBounds(p, tr.startState.doc.length);

            // clip these changes to within bounds before the transaction, so when
            // it's applied they are still within bounds
            const clip = makeClipper(startBounds);
            const changes = trChanges.map((change) => ({
              from: clip(change.from),
              to: clip(change.to),
              inserted: change.inserted,
            }));
            return [{ changes }];
          }

          // check any selections are out of bounds
          const selectionOob = tr.newSelection.ranges.some(
            (r) => r.from < bounds.from || r.to > bounds.to,
          );
          if (!selectionOob) {
            // allow this transaction, since its changes and selections are within bounds
            return <TransactionSpec>tr;
          }

          // clip the selection within bounds
          const clip = makeClipper(bounds);
          const selection = EditorSelection.create(
            tr.newSelection.ranges.map((r) =>
              EditorSelection.range(clip(r.anchor), clip(r.head)),
            ),
            tr.newSelection.mainIndex,
          );
          return [{ selection }];
        },
      ),
    ],
  };
};

const getBounds = (
  { prefix, suffix }: PuzzleState,
  docLength: number,
): SimpleRange => ({
  from: Math.min(docLength, prefix.length),
  to: Math.max(0, docLength - suffix.length),
});

const makeClipper = (bounds: SimpleRange) => (n: number) =>
  Math.min(Math.max(n, bounds.from), bounds.to);

export const getSolution = (state: EditorState): string => {
  const { from: fromBound, to: toBound } = getBounds(
    state.facet(puzzleFacet).getState(),
    state.doc.length,
  );

  return state.doc.sliceString(fromBound, toBound);
};
