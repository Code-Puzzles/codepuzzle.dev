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

export const cursorLineMargin = (view: EditorView): Extension => {
  return [
    // seems to the best approximation of CM5's `cursorScrollMargin`
    // https://discuss.codemirror.net/t/cursorscrollmargin-for-v6/7448
    EditorState.transactionExtender.of((tr) => {
      const s = tr.state;
      const { main } = s.selection;

      const { lines: cursorLineMargin } = s.facet(cursorLineMarginFacet);

      const rect = view.dom.getBoundingClientRect();

      const pxTop = rect.top - view.documentTop;
      const pxBot = rect.bottom - view.documentTop;

      const mainLine = s.doc.lineAt(main.head).number;
      const visTopLine = s.doc.lineAt(
        view.lineBlockAtHeight(pxTop).from,
      ).number;

      const botLineBlk = view.lineBlockAtHeight(pxBot);
      const visBotLineDoc = s.doc.lineAt(
        Math.min(botLineBlk.to, s.doc.length),
      ).number;
      const visBotLine =
        botLineBlk.bottom >= pxBot
          ? visBotLineDoc
          : visBotLineDoc +
            Math.floor((pxBot - botLineBlk.bottom) / view.defaultLineHeight);

      const topBound = visTopLine + cursorLineMargin;
      const botBound = visBotLine - cursorLineMargin;

      const needsScrollTop = mainLine <= topBound;
      const needsScrollBot = mainLine >= botBound;

      // the scroll margins are overlapping
      if (needsScrollTop && needsScrollBot) {
        console.warn("is cursorScrollMargin too large for the editor size?");
        return null;
      }

      // no need to scroll, we're in between scroll regions
      if (!needsScrollTop && !needsScrollBot) {
        return null;
      }

      // if we're within the margin, but moving the other way, then don't scroll
      if (tr.selection) {
        const oldMainLine = tr.startState.doc.lineAt(
          tr.startState.selection.main.head,
        ).number;
        if (needsScrollTop && oldMainLine < mainLine) return null;
        if (needsScrollBot && oldMainLine > mainLine) return null;
      }

      return {
        effects: EditorView.scrollIntoView(tr.newSelection.main.head, {
          y: needsScrollTop ? "start" : "end",
          yMargin: view.defaultLineHeight * cursorLineMargin,
        }),
      };
    }),
  ];
};
