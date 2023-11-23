import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { autocompletion } from "@codemirror/autocomplete";
import { basicSetup } from "codemirror";
import { type Puzzle } from "@jspuzzles/common";
import {
  puzzleFacet,
  puzzleReadOnlyExtension,
  createPuzzleFacet,
} from "./readonly-puzzle";
import { onChangeHandler } from "./on-change-listener";
import { displayExtension } from "./display";
import { cursorLineMarginFacet } from "./cursor-scroll-margin";

/**
 * Creates an empty editor
 */
export function emptyEditorState(view: EditorView): EditorState {
  const readOnly = EditorState.transactionFilter.of(() => []);
  return EditorState.create({
    doc: "//\n// Please choose a puzzle!\n//",
    extensions: [readOnly, displayExtension(view)],
  });
}

/**
 * Creates an editor configured for a puzzle
 */
export function getEditorState(
  view: EditorView,
  puzzle: Puzzle,
  onChange: (solution: string) => void,
  onSubmit: () => void,
  initialValue?: string,
): EditorState {
  const puzzleCfg = createPuzzleFacet(puzzle);

  // TODO: put all compartments in one place, and let them be configurable at runtime by exposing them to svelte
  const puzzleCompartment = new Compartment();
  const cursorLineMarginCompartment = new Compartment();
  const updatableConfig = [
    cursorLineMarginCompartment.of(cursorLineMarginFacet.of({ lines: 2 })),
    puzzleCompartment.of(puzzleFacet.of(puzzleCfg)),
  ];

  return EditorState.create({
    doc: [puzzleCfg.prefix, initialValue, puzzleCfg.suffix]
      .filter((s) => s)
      .join(""),

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
      // our updatable config
      updatableConfig,
      // makes portions of the editor readonly
      puzzleReadOnlyExtension,
      // fires the following callback whenever something is changed
      onChangeHandler(onChange),
      displayExtension(view),
      // make sure popup doesn't obscure results view (which is below the editor)
      autocompletion({ aboveCursor: true }),
      // basic editor setup - we might want to remove this and roll out own at some point
      basicSetup,
    ],
  });
}
