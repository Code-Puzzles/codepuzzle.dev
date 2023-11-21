import "./CodeMirror.postcss";
import { javascript } from "@codemirror/lang-javascript";
import {
  Compartment,
  EditorSelection,
  EditorState,
  Facet,
  Text,
  Transaction,
  type TransactionSpec,
} from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";
import { basicSetup } from "codemirror";
import { type Puzzle } from "@jspuzzles/common";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags, type Highlighter } from "@lezer/highlight";

const displayExtension = [
  // fixed height editor, which scrolls vertically
  EditorView.theme({
    "&": { height: "100%" },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { overflow: "auto" },
  }),
  // wrap long horizontal lines
  EditorView.lineWrapping,
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

export function emptyEditorState(): EditorState {
  const readOnly = EditorState.transactionFilter.of(() => []);
  return EditorState.create({
    doc: "//\n// Please choose a puzzle!\n//",
    extensions: [readOnly, displayExtension],
  });
}

export function getEditorState(
  puzzle: Puzzle,
  onChange: (solution: string) => void,
  onSubmit: () => void,
  initialValue?: string,
): EditorState {
  const facet = createPuzzleFacet(puzzle);
  return EditorState.create({
    doc: [facet.prefix, initialValue, facet.suffix].filter((s) => s).join(""),
    // NOTE: order is important here, since it affects precedence of extensions
    // higher precedence extensions come first
    extensions: [
      // our custom keybindings, ensure these override anything else so put them first
      keymap.of([
        {
          key: "Mod-Enter",
          run: () => {
            onSubmit();
            return true;
          },
        },
      ]),
      // contains logic for updating the current puzzle (used by the `puzzleReadOnlyExtension`)
      puzzleCompartment.of(puzzleFacet.of(facet)),
      // makes portions of the editor readonly
      puzzleReadOnlyExtension,
      // fires the following callback whenever something is changed
      onChangeHandler(onChange),
      displayExtension,
      // make sure popup doesn't obscure results view (which is below the editor)
      autocompletion({ aboveCursor: true }),
      // basic editor setup - we might want to remove this and roll out own at some point
      basicSetup,
    ],
  });
}

const onChangeHandler = (onChange: (solution: string) => void) =>
  EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;

    const { from: fromBound, to: toBound } = getBounds(
      update.state.facet(puzzleFacet),
      update.state.doc.length,
    );

    const solution = update.state.doc.sliceString(fromBound, toBound);
    onChange(solution);
  });

interface PuzzleFacet {
  prefix: string;
  suffix: string;
}

const puzzleCompartment = new Compartment();
const puzzleFacet = Facet.define<PuzzleFacet, PuzzleFacet>({
  combine: (input) => input[0] ?? { prefix: "-->", suffix: "<--" },
});

function createPuzzleFacet(puzzle: Puzzle): PuzzleFacet {
  const prefix = `// This is your function...\n${puzzle.source}\n\n// ... now make it return \`true\`!\n${puzzle.name}(`;
  const suffix = `);\n`;
  return { prefix, suffix };
}

interface Bounds {
  from: number;
  to: number;
}

const makeClipper = (bounds: Bounds) => (n: number) =>
  Math.min(Math.max(n, bounds.from), bounds.to);
const getBounds = (
  { prefix, suffix }: PuzzleFacet,
  docLength: number,
): Bounds => ({
  from: Math.min(docLength, prefix.length),
  to: Math.max(0, docLength - suffix.length),
});

// extension to only allow edits between certain ranges
// https://discuss.codemirror.net/t/migrating-readonly-textmarkers-from-codemirror-5-to-6/7337/5
const puzzleReadOnlyExtension = EditorState.transactionFilter.of(
  (tr: Transaction): TransactionSpec | readonly TransactionSpec[] => {
    // Get the previous value for the puzzle and the current one, to check for changes
    // I don't like that this check must happen on every transaction, surely there's a
    // better way to detect when a facet's value changes and apply doc transformations
    // there?
    const startPuzzle = tr.startState.facet(puzzleFacet);
    const currentPuzzle = tr.state.facet(puzzleFacet);
    const puzzleChanged =
      startPuzzle.prefix != currentPuzzle.prefix ||
      startPuzzle.suffix != currentPuzzle.suffix;

    // if the puzzle changed, update the doc
    if (puzzleChanged) {
      const len = tr.startState.doc.length;
      return [
        {
          // keep the effect, since the updated puzzle is in here
          effects: tr.effects,
          // add new changes to replace the prefix and suffix
          changes: [
            {
              from: 0,
              to: Math.min(startPuzzle.prefix.length, len),
              insert: currentPuzzle.prefix,
            },
            {
              from: Math.max(len - startPuzzle.suffix.length, 0),
              to: len,
              insert: currentPuzzle.suffix,
            },
          ],
        },
      ];
    }

    // allow all undo/redo transactions, since the transactions that created them
    // should already have been processed by us
    // https://discuss.codemirror.net/t/detect-if-transaction-is-an-undo-redo-event/7421
    if (tr.isUserEvent("undo") || tr.isUserEvent("redo")) {
      return <TransactionSpec>tr;
    }

    // get the bounds after this transaction would be applied
    const bounds = getBounds(currentPuzzle, tr.newDoc.length);

    // iterate over the changes this transaction applies to check if any of the
    // changes are out of bounds
    let oob = false;
    const trChanges: (Bounds & { inserted: Text })[] = [];
    tr.changes.iterChanges((startFrom, startTo, from, to, inserted) => {
      // check changes would be out of bounds in new document
      oob = oob || from < bounds.from || to > bounds.to + inserted.length;
      // save initial positions of all changes
      trChanges.push({ from: startFrom, to: startTo, inserted });
    });

    // if there were changes that were out of bounds
    if (oob) {
      // get the bounds before this transaction
      const startBounds = getBounds(currentPuzzle, tr.startState.doc.length);

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
);
