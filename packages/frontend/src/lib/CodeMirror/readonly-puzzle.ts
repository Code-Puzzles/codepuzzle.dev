import {
  EditorSelection,
  EditorState,
  Facet,
  RangeSet,
  RangeValue,
  StateField,
  Text,
  Transaction,
  type Extension,
  type TransactionSpec,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  keymap,
  type DecorationSet,
} from "@codemirror/view";
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
  initialIifeRanges: SimpleRange[];
}

/**
 * Given a puzzle, returns the required state for this CodeMirror extension.
 */
function puzzleState(puzzle: Puzzle, indentSize: number): PuzzleState {
  const indent = " ".repeat(indentSize);
  const intro = `// This is your function...\n\n`;
  const iifePrefix = `var ${puzzle.name} = (function () {\n`;
  const iifeSuffix = `\n${indent}return ${puzzle.name};\n})();\n`;
  // re-indent puzzle source properly
  const fn = puzzle.source
    .split("\n")
    .map((line) => {
      // NOTE: puzzles by default use an indent size of 2, so we update them
      // to the desired indent size when creating them here
      let [, ws, rest] = /^(\s*)(.+$)/.exec(line)!;
      // NOTE: `+ 1` because this puzzle will be wrapped in an iife
      return indent.repeat(ws!.length / 2 + 1) + rest;
    })
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
    initialIifeRanges: [start, iifeEnd],
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
 */
const iifeField = StateField.define<DecorationSet>({
  create: (state) =>
    Decoration.set(
      state
        .facet(puzzleFacet)
        .getState()
        .initialIifeRanges.map(({ from, to }) => iifeMark.range(from, to)),
    ),
  update: (decorations, tr) => decorations.map(tr.changes),
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Internal state for the `roField`.
 */
interface ReadOnlyField {
  decorations: DecorationSet;
  editableBounds: () => SimpleRange;
}

/**
 * This mark defines keeps track of the ranges of the readonly parts of the
 * editor, as well as the CSS class applied to said ranges.
 */
const roMark = Decoration.mark({ class: "cm-ro" });

/**
 * This StateField keeps track of the readonly sections of the editor, and also
 * provides a way to get the editable bounds of the current editor (via the
 * `ReadOnlyField`'s `editableBounds()` method).
 */
const roField = StateField.define<ReadOnlyField>({
  create: (state) => {
    const { prefix, suffix } = state.facet(puzzleFacet).getState();
    const len = state.doc.length;
    return {
      // TODO: investigate abstracting this into "read only ranges" not just a
      // pair of ranges specific to a puzzle
      decorations: Decoration.set([
        roMark.range(0, prefix.length),
        roMark.range(len - suffix.length, len),
      ]),
      editableBounds: function () {
        const [before, after] = collectRangeSet(this.decorations);
        if (!before || !after) throw new Error("invariant");
        return { from: before.to, to: after.from };
      },
    };
  },
  // NOTE: the transaction here is the one that's run after our transaction
  // filter, so it always contains "safe" changes (i.e., it doesn't contain
  // changes to readonly ranges of the editor).
  update: (ro, tr) => {
    // NOTE: it's important a new object is returned here, and not the old one
    // https://discuss.codemirror.net/t/using-editorview-scrollintoview-in-transactionextender-breaks-statefield-updates/7476
    return {
      ...ro,
      decorations: ro.decorations.map(tr.changes),
    };
  },
  provide: (field) => [
    // this state field manages the iife decorations
    iifeField,

    // this filter makes everything readonly
    EditorState.transactionFilter.of((tr: Transaction): TransactionSpec => {
      // allow all undo/redo transactions, since the transactions that created them
      // should already have been processed by us
      // https://discuss.codemirror.net/t/detect-if-transaction-is-an-undo-redo-event/7421
      if (tr.isUserEvent("undo") || tr.isUserEvent("redo")) {
        return tr;
      }

      // get the bounds before this transaction would be applied
      // const bounds = getBounds(p, tr.startState.doc.length);
      const bounds = tr.startState.field(field).editableBounds();

      // iterate over the changes this transaction applies to check if any of
      // the changes are out of bounds
      let oob = false;
      const trChanges: (SimpleRange & { inserted: Text })[] = [];
      tr.changes.iterChanges((from, to, _, __, inserted) => {
        // check changes would be out of bounds in new document
        oob = oob || from < bounds.from || to >= bounds.to + inserted.length;
        // save initial positions of all changes
        trChanges.push({ from, to, inserted });
      });

      // no changes were out of bounds, so allow this change
      if (!oob) return tr;

      // othewise, clip the changes to within bounds before the transaction
      // so when it's applied they are still within bounds
      const clip = makeClipper(bounds);
      const changes = tr.startState.changes(
        trChanges.map((change) => ({
          from: clip(change.from),
          to: clip(change.to),
          inserted: change.inserted,
        })),
      );

      // update selection to be within bounds
      let selection = tr.newSelection;
      // NOTE: iterate in reverse order so we don't mutate a range before
      // we clip it
      const ranges = Array.from(selection.ranges.entries()).reverse();
      for (const [i, range] of ranges) {
        selection = selection.replaceRange(
          EditorSelection.range(clip(range.anchor), clip(range.head)),
          i,
        );
      }

      return { changes, selection };
    }),
    // override the "select all" command to switch between selecting the editable
    // region and the entire document
    keymap.of([
      {
        key: "Mod-a",
        run: (view) => {
          const { from, to } = view.state.field(field).editableBounds();
          const { selection } = view.state;
          if (
            selection.ranges.length === 1 &&
            selection.main.from === from &&
            selection.main.to === to
          ) {
            return false;
          }

          view.dispatch({ selection: EditorSelection.single(from, to) });
          return true;
        },
      },
    ]),
    // tell the editor view to mark our ranges as decorations (and thus create
    // the dom classes)
    EditorView.decorations.of((view) => view.state.field(field).decorations),
  ],
});

export interface PuzzleReadOnlyExtension {
  doc: string;
  selection: EditorSelection;
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
  const doc = [p.prefix, initialValue, p.suffix].filter((s) => s).join("");
  const selection = EditorSelection.single(p.prefix.length);
  return {
    doc,
    selection,
    extension: [
      // this facet let's other parts of CodeMirror access the puzzle state
      puzzleFacet.of(p),
      // our extension
      roField,
    ],
  };
};

/*
 * Utils
 */

const collectRangeSet = (set: RangeSet<RangeValue>): SimpleRange[] => {
  const ranges: SimpleRange[] = [];
  for (let r = set.iter(); r.value; r.next()) {
    ranges.push({ from: r.from, to: r.to });
  }

  return ranges;
};

const makeClipper = (bounds: SimpleRange) => (n: number) =>
  Math.min(Math.max(n, bounds.from), bounds.to);

export const getSolution = (state: EditorState): string => {
  const { from, to } = state.field(roField).editableBounds();
  return state.doc.sliceString(from, to);
};

export const setSolution = (view: EditorView, value: string) => {
  const { from, to } = view.state.field(roField).editableBounds();
  view.dispatch({ changes: [{ from, to, insert: value }] });
};
