import {
  Compartment,
  EditorSelection,
  EditorState,
  Facet,
  StateEffect,
  type EditorStateConfig,
  type Extension,
} from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentRange, indentUnit } from "@codemirror/language";
import { basicSetup } from "codemirror";
import { type Puzzle } from "@jspuzzles/common";
import { puzzleReadOnlyExtension, setSolution } from "./readonly-puzzle";
import { onChangeHandler, type OnChangeCb } from "./on-change-listener";
import { displayExtension } from "./display";
import { cursorLineMarginFacet, cursorLineMargin } from "./cursor-line-margin";

const tabSizeToIndentUnit = (tabSize: number): string =>
  " ".repeat(Math.max(1, tabSize));

/**
 * A wrapper around CodeMirror 6's dynamic configuration system which makes it
 * easier to use and consume.
 */
class ReconfigurableFacet<FacetIn, FacetOut = FacetIn> {
  readonly #compartment = new Compartment();
  readonly #facet: Facet<FacetIn, FacetOut>;
  readonly #defaultValue: FacetIn;
  readonly #extension: Extension;
  #lastSetValue: FacetIn;

  public constructor(
    facet: Facet<FacetIn, FacetOut>,
    defaultValue: FacetIn,
    extension?: Extension,
  ) {
    this.#facet = facet;
    this.#extension = extension ?? [];
    this.#defaultValue = this.#lastSetValue = defaultValue;
  }

  public value(): FacetIn {
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

  public effect(value: FacetIn): StateEffect<unknown> {
    return this.#compartment.reconfigure(
      this.#facet.of((this.#lastSetValue = value)),
    );
  }
}

export interface CodeMirrorOptions {
  indentSize: number;
  cursorLineMargin: number;
}

export class CodeMirror {
  /*
   * Reconfigurable options
   * TODO: include common editor options, like keymaps, etc
   */
  readonly #cursorLineMargin: ReconfigurableFacet<number>;
  readonly #indentUnit: ReconfigurableFacet<string>;
  readonly #tabSize: ReconfigurableFacet<number>;
  #reconfigurableFacets(): Extension {
    return [
      this.#cursorLineMargin.extension(),
      this.#indentUnit.extension(),
      this.#tabSize.extension(),
    ];
  }

  readonly #view: EditorView;

  public constructor(dom: HTMLElement, options?: CodeMirrorOptions) {
    // stop other key events from happening when editor is focused
    dom.addEventListener("keydown", (event) => event.stopPropagation());
    this.#view = new EditorView({ parent: dom });

    // restore options
    this.#tabSize = new ReconfigurableFacet(
      EditorState.tabSize,
      options?.indentSize ?? 2,
    );
    this.#indentUnit = new ReconfigurableFacet(
      indentUnit,
      tabSizeToIndentUnit(this.#tabSize.value()),
    );
    this.#cursorLineMargin = new ReconfigurableFacet(
      cursorLineMarginFacet,
      options?.cursorLineMargin ?? 2,
      cursorLineMargin,
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

  /**
   * Sets up the editor for a puzzle
   */
  public setPuzzle(
    puzzle: Puzzle,
    onChange: OnChangeCb,
    onSubmit: () => void,
    initialValue?: string,
    initialSelection?: EditorSelection,
  ) {
    let {
      doc,
      selection,
      extension: puzzleExtension,
    } = puzzleReadOnlyExtension(puzzle, this.#tabSize.value(), initialValue);

    if (initialSelection) {
      const restored = EditorSelection.fromJSON(initialSelection);
      const bw = (value: number) => value >= 0 && value <= doc.length;
      if (restored.ranges.every(({ from, to }) => bw(from) && bw(to))) {
        selection = restored;
      }
    }

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
        // basic editor setup - we might want to remove this and roll our own at some point
        basicSetup,
      ],
    };

    this.#view.setState(EditorState.create(editorConfig));
    this.#view.focus();
  }

  /*
   * Exposed configuration
   */

  public get indentSize(): number {
    return this.#tabSize.value();
  }
  public set indentSize(value: number) {
    this.#view.dispatch({
      effects: [
        this.#tabSize.effect(value),
        this.#indentUnit.effect(tabSizeToIndentUnit(value)),
      ],
    });

    // reindent the puzzle
    this.#view.dispatch({
      changes: indentRange(this.#view.state, 0, this.#view.state.doc.length),
      filter: false,
    });
  }

  public get cursorLineMargin(): number {
    return this.#cursorLineMargin.value();
  }
  public set cursorLineMargin(lines: number) {
    this.#view.dispatch({ effects: this.#cursorLineMargin.effect(lines) });
  }
}
