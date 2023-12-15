import {
  Compartment,
  EditorSelection,
  EditorState,
  Transaction,
} from "@codemirror/state";
import { test, expect, describe } from "vitest";
import { puzzleReadOnlyExtension } from "./readonly-puzzle";
import { indentRange, indentUnit } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { PuzzleGroup } from "@codepuzzles/common";

const puzzleSource = `a;
{
  b;
  {
    c;
  }
}`;

const tabSizeC = new Compartment();
const indentUnitC = new Compartment();
const getState = (initialValue = "", indentSize = 2): EditorState => {
  const { doc, selection, extension } = puzzleReadOnlyExtension(
    { id: "", name: "test", source: puzzleSource, group: PuzzleGroup.Beginner },
    indentSize,
    initialValue,
  );
  return EditorState.create({
    doc,
    selection,
    extensions: [
      extension,
      tabSizeC.of(EditorState.tabSize.of(indentSize)),
      indentUnitC.of(indentUnit.of(" ".repeat(indentSize))),
      // this is required since it provides indentation information
      javascript(),
    ],
  });
};

const update = (
  state: EditorState,
  from: number,
  to: number,
  insert: string,
): Transaction =>
  state.update({ changes: state.changes({ from, to, insert }) });

const getDoc = (
  state: EditorState,
  from: number,
  to: number,
  insert: string,
): string => update(state, from, to, insert).newDoc.toString();

const cmIndent = (state: EditorState, indentSize: number) => {
  // change indentation size
  let tr = state.update({
    effects: [
      tabSizeC.reconfigure(EditorState.tabSize.of(indentSize)),
      indentUnitC.reconfigure(indentUnit.of(" ".repeat(indentSize))),
    ],
  });

  // reindent document
  tr = tr.state.update({
    changes: indentRange(tr.state, 0, tr.state.doc.length),
    filter: false,
    annotations: Transaction.userEvent.of("foo"),
  });

  return tr.state;
};

const prefix = `// This is your function...

var test = (function () {
  a;
  {
    b;
    {
      c;
    }
  }
  return test;
})();

// ... now make it return \`true\`!
test(`;
const suffix = `);\n`;
const doc = (solution = "") => prefix + solution + suffix;

const pLen = prefix.length;
const sLen = suffix.length;

const indenter = (from: number, to: number) => (s: string) =>
  s.replace(new RegExp(" ".repeat(from), "g"), " ".repeat(to));

test("sanity", () => {
  const s = getState();
  expect(s.doc.toString()).toEqual(doc());
});

describe("multiple cursors", () => {
  test("multiple cursors collapse when there's a change", () => {
    const s = getState();
    const cursors = [
      { from: 0, to: 0 },
      { from: s.doc.length, to: s.doc.length },
    ];
    const tr = s.update({
      selection: EditorSelection.create(
        cursors.map(({ from, to }) => EditorSelection.range(from, to)),
      ),
      changes: s.changes(
        cursors.map(({ from, to }) => ({ from, to, insert: "x" })),
      ),
    });

    const { length: len } = tr.newDoc;
    expect(tr.newDoc.toString()).toEqual(doc("xx"));
    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({ anchor: len - sLen, head: len - sLen }),
    ]);
  });

  test("multiple cursors collapse when there's a change with content", () => {
    const s = getState("123");

    const cursors = [
      { from: 0, to: 0 },
      { from: s.doc.length, to: s.doc.length },
    ];
    const tr = s.update({
      selection: EditorSelection.create(
        cursors.map(({ from, to }) => EditorSelection.range(from, to)),
      ),
      changes: s.changes([
        cursors.map(({ from, to }) => ({ from, to, insert: "x" })),
      ]),
    });

    const { length: len } = tr.newDoc;
    expect(tr.newDoc.toString()).toEqual(doc("x123x"));
    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({ anchor: pLen + 1, head: pLen + 1 }),
      expect.objectContaining({ anchor: len - sLen, head: len - sLen }),
    ]);
  });
});

describe("indenting", () => {
  test("indentation of puzzles is comptuted properly", () => {
    const indent = indenter(2, 8);
    expect(getState("foo", 8).doc.toString()).toEqual(indent(doc("foo")));
  });

  test("reindenting and starting with indent have same result", () => {
    const value = "\n      foo\n";
    const indentSize = 6;
    const startIndented = getState(value, indentSize);
    const reindented = cmIndent(getState(value, 2), indentSize);
    expect(startIndented.doc.toString()).toEqual(reindented.doc.toString());
  });

  test("change bounds map properly after reindenting document", () => {
    const startSize = 2;
    const newSize = 4;
    const indent = indenter(startSize, newSize);

    // indent with codemirror
    const s = cmIndent(getState("", startSize), newSize);

    // check indentation worked
    expect(s.doc.toString()).toEqual(indent(doc()));
    // apply a change to the entire document and make sure it worked
    expect(getDoc(s, 0, s.doc.length, "foo")).toEqual(indent(doc("foo")));
  });
});

describe("delete", () => {
  test("within readonly ranges", () => {
    const s = getState();
    const { length: len } = s.doc;

    expect(getDoc(s, 0, 1, "")).toEqual(doc());
    expect(getDoc(s, 0, pLen, "")).toEqual(doc());
    expect(getDoc(s, pLen - 1, pLen, "")).toEqual(doc());
    expect(getDoc(s, len - sLen, len - sLen + 1, "")).toEqual(doc());
    expect(getDoc(s, len - sLen, len, "")).toEqual(doc());
  });

  test("from editable range into readonly", () => {
    const s = getState("xy");
    const { length: len } = s.doc;

    expect(getDoc(s, 0, pLen + 1, "")).toEqual(doc("y"));
    expect(getDoc(s, pLen + 1, len, "")).toEqual(doc("x"));
  });

  test("entire document", () => {
    const s = getState("xy");
    const { length: len } = s.doc;

    const tr = update(s, 0, len, "");
    expect(tr.newDoc.toString()).toEqual(doc());
    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({ anchor: pLen, head: pLen }),
    ]);
  });
});

describe("insert", () => {
  test("within readonly ranges", () => {
    const s = getState();
    const { length: len } = s.doc;

    expect(getDoc(s, 0, 0, "a")).toEqual(doc("a"));
    expect(getDoc(s, pLen - 1, pLen - 1, "a")).toEqual(doc("a"));
    expect(getDoc(s, pLen + 2, pLen + 2, "a")).toEqual(doc("a"));
    expect(getDoc(s, len, len, "a")).toEqual(doc("a"));
    expect(getDoc(s, len - 1, len - 1, "a")).toEqual(doc("a"));
  });

  test("within prefix", () => {
    const s = getState();
    const tr = update(s, 0, 0, "a");
    expect(tr.newDoc.toString()).toEqual(doc("a"));
    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({ anchor: pLen + 1, head: pLen + 1 }),
    ]);
  });

  test("within suffix", () => {
    const s = getState();
    const tr = update(s, 0, 0, "a");
    const { length: len } = tr.newDoc;
    expect(tr.newDoc.toString()).toEqual(doc("a"));
    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({ anchor: len - sLen, head: len - sLen }),
    ]);
  });

  test("prefix.to boundary", () => {
    expect(getDoc(getState(), pLen - 1, pLen - 1, "a")).toEqual(doc("a"));
  });

  test("suffix.from boundary", () => {
    expect(getDoc(getState(), pLen + 1, pLen + 1, "a")).toEqual(doc("a"));
  });

  test("at prefix.to", () => {
    expect(getDoc(getState(), pLen, pLen, "a")).toEqual(doc("a"));
  });

  test("at prefix.to, with content", () => {
    expect(getDoc(getState("a"), pLen, pLen, "b")).toEqual(doc("ba"));
  });

  test("at suffix.from, with content", () => {
    const s = getState("a");
    const { length: len } = s.doc;
    expect(getDoc(s, len - sLen, len - sLen, "b")).toEqual(doc("ab"));
  });

  test("completely within editable", () => {
    const s = getState("xx");
    expect(getDoc(s, pLen + 1, pLen + 1, "y")).toEqual(doc("xyx"));
  });
});

describe("replace", () => {
  test("within readonly ranges", () => {
    const s = getState();
    const { length: len } = s.doc;
    expect(getDoc(s, 0, pLen, "foo")).toEqual(doc("foo"));
    expect(getDoc(s, pLen + 1, len, "foo")).toEqual(doc("foo"));
  });

  test("entire document", () => {
    const s = getState();
    const { length: len } = s.doc;
    expect(getDoc(s, 0, len, "foo")).toEqual(doc("foo"));
  });

  test("over prefix.to boundary", () => {
    expect(getDoc(getState(), pLen - 1, pLen, "foo")).toEqual(doc("foo"));
  });

  test("over prefix.to boundary, with content", () => {
    const inserted = "xxx";
    const tr = update(getState("foo"), pLen - 1, pLen + 1, inserted);
    expect(tr.newDoc.toString()).toEqual(doc("xxxoo"));
    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({
        anchor: pLen + inserted.length,
        head: pLen + inserted.length,
      }),
    ]);
  });

  test("over suffix.from boundary, with content", () => {
    const v = "foo";
    const s = getState(v);
    const { length: len } = s.doc;
    const tr = update(s, pLen + 1, len, "xxx");
    expect(tr.newDoc.toString()).toEqual(doc("fxxx"));
    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({
        anchor: pLen + v.length + 1,
        head: pLen + v.length + 1,
      }),
    ]);
  });

  test("paste in suffix", () => {
    const s = getState();
    const { length: len } = s.doc;
    const pos = len - sLen + 1;
    expect(getDoc(s, pos, pos, "pasted")).toEqual(doc("pasted"));
  });

  test("paste end end of document", () => {
    const s = getState();
    const { length: len } = s.doc;
    expect(getDoc(s, len, len, "pasted")).toEqual(doc("pasted"));
  });
});
