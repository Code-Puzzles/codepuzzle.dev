import { Facet, type Extension, EditorState } from "@codemirror/state";
import { EditorView } from "codemirror";

export interface CursorLineMarginFacet {
  /**
   * Number of lines above/below the cursor to keep visible in the viewport
   */
  lines: number;
}
export const cursorLineMarginFacet = Facet.define<
  CursorLineMarginFacet,
  CursorLineMarginFacet
>({
  combine: (input) => input[0] ?? { lines: 0 },
});

export const cursorScrollMargin = (view: EditorView): Extension => [
  // seems to the best approximation of CM5's `cursorScrollMargin`
  // https://discuss.codemirror.net/t/cursorscrollmargin-for-v6/7448
  EditorState.transactionExtender.of((tr) => {
    // get configuration
    const { lines: cursorLineMargin } = view.state.facet(cursorLineMarginFacet);

    // get visible lines
    const rect = view.dom.getBoundingClientRect();
    const firstLineBlock = view.state.doc.lineAt(
      view.lineBlockAtHeight(rect.top - view.documentTop).from,
    );
    const lastLineBlock = view.state.doc.lineAt(
      view.lineBlockAtHeight(rect.bottom - view.documentTop).to,
    );

    // get line that main selection is on
    const { main } = tr.newSelection;
    const { to: line, height } = view.lineBlockAt(main.head);

    // if past top margin, scroll...
    const yMargin = height * cursorLineMargin;
    if (line <= firstLineBlock.from + cursorLineMargin) {
      return {
        effects: EditorView.scrollIntoView(main, { y: "start", yMargin }),
      };
    }

    // if past bottom margin, scroll...
    if (line >= lastLineBlock.to - cursorLineMargin) {
      return {
        effects: EditorView.scrollIntoView(main, { y: "end", yMargin }),
      };
    }

    // within both margins, do nothing
    return null;
  }),
];
