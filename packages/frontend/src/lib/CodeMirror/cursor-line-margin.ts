import {
  Facet,
  type Extension,
  EditorState,
  Transaction,
} from "@codemirror/state";
import { EditorView } from "codemirror";

/**
 * Number of lines above/below the cursor to keep visible in the viewport.
 * Defaults to 1.
 */
export const cursorLineMarginFacet = Facet.define<number, number>({
  combine: (input) => input[0] ?? 1,
});

const annotation = "cursorLineMargin";
const lineAtPos = (s: EditorState, pos: number) => s.doc.lineAt(pos).number;
// seems to the best approximation of CM5's `cursorScrollMargin`
// https://discuss.codemirror.net/t/cursorscrollmargin-for-v6/7448
export const cursorLineMargin: Extension = EditorView.updateListener.of(
  ({ transactions, state, selectionSet, startState, view }) => {
    // ignore our own updates to avoid infinite loops
    if (transactions.some((tr) => tr.isUserEvent(annotation))) return;

    const s = state;
    const { main } = s.selection;
    const cursorLineMargin = s.facet(cursorLineMarginFacet);

    // editor rect
    const rect = view.dom.getBoundingClientRect();
    // top and bottom pixel positions of the visible region of the editor
    const viewportTop = rect.top - view.documentTop;
    const viewportBottom = rect.bottom - view.documentTop;

    // line with main selection
    const mainLine = lineAtPos(s, main.head);
    // top most visible line
    const visTopLine = lineAtPos(s, view.lineBlockAtHeight(viewportTop).from);

    // bottom most visible line
    // NOTE: calculating this is slightly more complex - if the editor is
    // larger than all the lines in it, and the `scrollPastEnd()` extension is
    // enabled, then we need to calculate where the bottom most visible line
    // should be if it extended all the way to the bottom of the editor
    const botLineBlk = view.lineBlockAtHeight(viewportBottom);
    const visBotLineDoc = lineAtPos(s, Math.min(botLineBlk.to, s.doc.length));
    const visBotLine =
      botLineBlk.bottom >= viewportBottom
        ? visBotLineDoc
        : visBotLineDoc +
          Math.floor(
            (viewportBottom - botLineBlk.bottom) / view.defaultLineHeight,
          );

    const needsScrollTop = mainLine <= visTopLine + cursorLineMargin;
    const needsScrollBot = mainLine >= visBotLine - cursorLineMargin;

    // the scroll margins are overlapping
    if (needsScrollTop && needsScrollBot) {
      console.warn("is cursorScrollMargin too large for the editor size?");
      return;
    }

    // no need to scroll, we're in between scroll regions
    if (!needsScrollTop && !needsScrollBot) {
      return;
    }

    // if we're within the margin, but moving the other way, then don't scroll
    if (selectionSet) {
      const { head } = startState.selection.main;
      const oldMainLine = lineAtPos(startState, head);
      if (needsScrollTop && oldMainLine < mainLine) return;
      if (needsScrollBot && oldMainLine > mainLine) return;
    }

    view.dispatch({
      annotations: Transaction.userEvent.of(annotation),
      effects: EditorView.scrollIntoView(s.selection.main.head, {
        y: needsScrollTop ? "start" : "end",
        yMargin: view.defaultLineHeight * cursorLineMargin,
      }),
    });
  },
);
