import {
  Compartment,
  EditorState,
  Facet,
  type Extension,
  StateEffect,
} from "@codemirror/state";
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
import {
  cursorLineMarginFacet,
  type CursorLineMarginFacet,
} from "./cursor-scroll-margin";

/**
 * A wrapper around CodeMirror 6's dynamic configuration system which makes it
 * easier to use and consume.
 */
class ReconfigurableValue<In, Out> {
  readonly #compartment = new Compartment();
  readonly #facet: Facet<In, Out>;
  readonly #defaultValue: In;
  #lastSetValue: In | null = null;

  public constructor(facet: Facet<In, Out>, defaultValue: In) {
    this.#facet = facet;
    this.#defaultValue = defaultValue;
  }

  public extension(): Extension {
    return this.#compartment.of(
      this.#facet.of(this.#lastSetValue ?? this.#defaultValue),
    );
  }

  public effect(value: In): StateEffect<unknown> {
    return this.#compartment.reconfigure(
      this.#facet.of((this.#lastSetValue = value)),
    );
  }
}

export class CodeMirror {
  /*
   * Reconfigurable options
   * TODO: include common editor options, like keymaps, tab size, etc
   */
  readonly #clmCfg = new ReconfigurableValue(cursorLineMarginFacet, {
    lines: 2,
  });

  readonly #view: EditorView;
  readonly #displayExtension: Extension;

  public constructor(dom: HTMLElement) {
    // stop other key events from happening when editor is focused
    dom.addEventListener("keydown", (event) => event.stopPropagation());
    this.#view = new EditorView({ parent: dom });
    this.#displayExtension = displayExtension(this.#view);
  }

  /**
   * Sets the editor to be empty
   */
  public setEmpty() {
    const readOnly = EditorState.transactionFilter.of(() => []);
    this.#view.setState(
      EditorState.create({
        doc: "//\n// Please choose a puzzle!\n//",
        extensions: [readOnly, this.#displayExtension],
      }),
    );
  }

  /**
   * Sets up the editor for a puzzle
   */
  // TODO wrap puzzle in greyed out iife
  public setPuzzle(
    puzzle: Puzzle,
    onChange: (solution: string) => void,
    onSubmit: () => void,
    initialValue?: string,
  ) {
    const puzzleCfg = createPuzzleFacet(puzzle);

    this.#view.setState(
      EditorState.create({
        selection: { anchor: puzzleCfg.prefix.length },
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
          // the puzzle
          puzzleFacet.of(puzzleCfg),
          // our updatable config
          this.#clmCfg.extension(),
          // makes portions of the editor readonly
          puzzleReadOnlyExtension,
          // fires the following callback whenever something is changed
          onChangeHandler(onChange),
          this.#displayExtension,
          // make sure popup doesn't obscure results view (which is below the editor)
          autocompletion({ aboveCursor: true }),
          // basic editor setup - we might want to remove this and roll out own at some point
          basicSetup,
        ],
      }),
    );
    this.#view.focus();
  }

  /*
   * Exposed configuration
   */

  public setCursorLineMargin(value: CursorLineMarginFacet) {
    this.#view.dispatch({ effects: this.#clmCfg.effect(value) });
  }
}
