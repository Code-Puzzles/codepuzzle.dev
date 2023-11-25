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

const tabSizeC = new Compartment();
const indentUnitC = new Compartment();
const getState = (initialValue = "", indentSize = 2): EditorState => {
  const { doc, selection, extension } = puzzleReadOnlyExtension(
    { index: -1, name: "test", source: "source" },
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

const prefix = `// This is your function...

var test = (function () {
  source
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

describe("selection", () => {
  test("multiple cursors collapse when there's a change", () => {
    const s = getState();
    const { length: len } = s.doc;
    const tr = s.update({
      selection: EditorSelection.create([
        EditorSelection.range(0, 0),
        EditorSelection.range(10, 10),
        EditorSelection.range(len, len),
      ]),
      changes: s.changes({ from: 0, to: 0, insert: "x" }),
    });

    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({ anchor: pLen, head: pLen }),
    ]);
  });
});

describe("unfiltered changes", () => {
  test("change bounds map properly after reindenting document", () => {
    const startSize = 2;
    const newSize = 4;
    const indent = indenter(startSize, newSize);

    const s = getState("", startSize);

    // change indentation size
    let tr = s.update({
      effects: [
        tabSizeC.reconfigure(EditorState.tabSize.of(newSize)),
        indentUnitC.reconfigure(indentUnit.of(" ".repeat(newSize))),
      ],
    });

    // reindent document
    tr = tr.state.update({
      changes: indentRange(tr.state, 0, tr.state.doc.length),
      filter: false,
      annotations: Transaction.userEvent.of("foo"),
    });

    // check indentation worked
    expect(tr.newDoc.toString()).toEqual(indent(doc()));
    // apply a change to the entire document and make sure it worked
    expect(getDoc(tr.state, 0, tr.newDoc.length, "foo")).toEqual(indent(doc()));
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

    expect(getDoc(s, 0, 0, "a")).toEqual(doc());
    expect(getDoc(s, pLen - 1, pLen - 1, "a")).toEqual(doc());
    expect(getDoc(s, pLen + 2, pLen + 2, "a")).toEqual(doc());
    expect(getDoc(s, len, len, "a")).toEqual(doc());
    expect(getDoc(s, len - 1, len - 1, "a")).toEqual(doc());
  });

  test("prefix.to boundary", () => {
    expect(getDoc(getState(), pLen - 1, pLen - 1, "a")).toEqual(doc());
  });

  test("suffix.from boundary", () => {
    expect(getDoc(getState(), pLen + 1, pLen + 1, "a")).toEqual(doc());
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
    expect(getDoc(s, 0, pLen, "foo")).toEqual(doc());
    expect(getDoc(s, pLen + 1, len, "foo")).toEqual(doc());
  });

  test("entire document", () => {
    const s = getState();
    const { length: len } = s.doc;
    expect(getDoc(s, 0, len, "foo")).toEqual(doc());
  });

  test("over prefix.to boundary", () => {
    expect(getDoc(getState(), pLen - 1, pLen, "foo")).toEqual(doc());
  });

  test("over prefix.to boundary, with content", () => {
    const tr = update(getState("foo"), pLen - 1, pLen + 1, "xxx");
    expect(tr.newDoc.toString()).toEqual(doc("oo"));
    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({
        anchor: pLen,
        head: pLen,
      }),
    ]);
  });

  test("over suffix.from boundary, with content", () => {
    const v = "foo";
    const s = getState(v);
    const { length: len } = s.doc;
    const tr = update(s, pLen + 1, len, "xxx");
    expect(tr.newDoc.toString()).toEqual(doc("f"));
    expect(tr.newSelection.ranges).toEqual([
      expect.objectContaining({
        anchor: pLen,
        head: pLen,
      }),
    ]);
  });
});
