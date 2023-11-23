import {
  Compartment,
  EditorState,
  Facet,
  type Extension,
  StateEffect,
  type EditorStateConfig,
} from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { basicSetup } from "codemirror";
import { type Puzzle } from "@jspuzzles/common";
import {
  getSolution,
  puzzleReadOnlyExtension,
  setSolution,
} from "./readonly-puzzle";
import { onChangeHandler, type OnChangeCb } from "./on-change-listener";
import { displayExtension } from "./display";
import {
  cursorLineMarginFacet,
  cursorLineMargin,
  type CursorLineMarginFacet,
} from "./cursor-line-margin";

/**
 * A wrapper around CodeMirror 6's dynamic configuration system which makes it
 * easier to use and consume.
 */
class ReconfigurableFacet<In, Out = In> {
  readonly #compartment = new Compartment();
  readonly #facet: Facet<In, Out>;
  readonly #defaultValue: In;
  readonly #extension: Extension;
  #lastSetValue: In;

  public constructor(
    facet: Facet<In, Out>,
    defaultValue: In,
    extension?: Extension,
  ) {
    this.#facet = facet;
    this.#extension = extension ?? [];
    this.#defaultValue = this.#lastSetValue = defaultValue;
  }

  public value(): In {
    return this.#lastSetValue;
  }

  public extension(): Extension {
    return [
      this.#extension,
      this.#compartment.of(
        this.#facet.of(this.#lastSetValue ?? this.#defaultValue),
      ),
    ];
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
   * TODO: include common editor options, like keymaps, etc
   */
  readonly #cursorLineMargin: ReconfigurableFacet<CursorLineMarginFacet>;
  readonly #tabSize = new ReconfigurableFacet(EditorState.tabSize, 2);
  readonly #indentUnit = new ReconfigurableFacet(
    indentUnit,
    " ".repeat(Math.max(1, this.#tabSize.value())),
  );
  #reconfigurableFacets(): Extension {
    return [
      this.#cursorLineMargin.extension(),
      this.#indentUnit.extension(),
      this.#tabSize.extension(),
    ];
  }

  readonly #view: EditorView;

  public constructor(dom: HTMLElement) {
    // stop other key events from happening when editor is focused
    dom.addEventListener("keydown", (event) => event.stopPropagation());
    this.#view = new EditorView({ parent: dom });
    this.#cursorLineMargin = new ReconfigurableFacet(
      cursorLineMarginFacet,
      { lines: 2 },
      cursorLineMargin(this.#view),
    );
  }

  /**
   * Sets the editor to be empty
   */
  public setEmpty() {
    const readOnly = EditorState.transactionFilter.of(() => []);
    this.#view.setState(
      EditorState.create({
        doc: "//\n// Please choose a puzzle!\n//",
        extensions: [readOnly, displayExtension, this.#reconfigurableFacets()],
      }),
    );
  }

  /**
   * Set a solution into the editable area of the editor
   */
  public setSolution(value: string) {
    setSolution(this.#view, value);
    this.#view.focus();
  }

  /**
   * Focus the editor
   */
  public focus() {
    this.#view.focus();
  }

  // This helps us reset the puzzle state internally if required.
  #resetPuzzle?: (initialValue?: string) => void;

  /**
   * Sets up the editor for a puzzle
   */
  public setPuzzle(
    puzzle: Puzzle,
    onChange: OnChangeCb,
    onSubmit: () => void,
    initialValue?: string,
  ) {
    this.#resetPuzzle = (initialValue?: string) => {
      const {
        doc,
        selection,
        extension: puzzleExtension,
      } = puzzleReadOnlyExtension(puzzle, this.#tabSize.value(), initialValue);

      const editorConfig: EditorStateConfig = {
        doc,
        selection,
        // NOTE: order is important here, since it affects precedence of extensions
        // higher precedence extensions come first
        extensions: [
          // our custom keybindings, ensure these override anything else so put them first
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => (onSubmit(), true),
            },
          ]),
          // our updatable config
          this.#reconfigurableFacets(),
          // makes portions of the editor readonly
          puzzleExtension,
          // fires the following callback whenever something is changed
          onChangeHandler(onChange),
          // display
          displayExtension,
          // basic editor setup - we might want to remove this and roll out own at some point
          basicSetup,
        ],
      };

      this.#view.setState(EditorState.create(editorConfig));
      this.#view.focus();
    };

    this.#resetPuzzle(initialValue);
  }

  /*
   * Exposed configuration
   */

  public get tabSize(): number {
    return this.#tabSize.value();
  }
  public set tabSize(value: number) {
    this.#view.dispatch({
      effects: [
        this.#tabSize.effect(value),
        this.#indentUnit.effect(" ".repeat(Math.max(1, value))),
      ],
    });

    // reset the puzzle, since the indentation has changed now
    this.#resetPuzzle?.(getSolution(this.#view.state));
  }

  public get cursorLineMargin(): number {
    return this.#cursorLineMargin.value().lines;
  }
  public set cursorLineMargin(lines: number) {
    this.#view.dispatch({ effects: this.#cursorLineMargin.effect({ lines }) });
  }
}
