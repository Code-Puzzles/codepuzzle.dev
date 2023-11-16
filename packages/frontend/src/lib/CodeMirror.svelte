<script lang="ts">
  import { EditorView } from "@codemirror/view";
  import {
    puzzles,
    type Puzzle,
    type JudgeResultWithCount,
  } from "@rttw/common-browser";
  import { onMount } from "svelte";
  import { getEditorState } from "./CodeMirror";
  import { evalInBrowser, submitToBackend } from "./submit";

  export let puzzle: Puzzle = puzzles["season1"]![0]!;
  export let result: JudgeResultWithCount | undefined = undefined;
  export let loading = false;

  let root: HTMLElement;
  let view: EditorView;
  let solution: string = "";

  $: view && putPuzzleIntoEditor(puzzle);

  function onChange(value: string) {
    solution = value;
    result = evalInBrowser(puzzle, value);
  }

  function onSubmit() {
    result = undefined;
    loading = true;
    submitToBackend(puzzle, solution)
      .then((r) => (result = r))
      .finally(() => (loading = false));
  }

  function putPuzzleIntoEditor(puzzle: Puzzle) {
    view.setState(getEditorState(puzzle, onChange, onSubmit));
    view.focus();
  }

  onMount(() => {
    // stop all other events from happening when editor is focused
    root.addEventListener("keydown", (event) => event.stopPropagation());
    // setup editor
    view = new EditorView({ parent: root });
  });
</script>

<div class="editor" bind:this={root} />

<style>
  .editor {
    background: white;
    color: black;
    border: 1px solid red;
  }
</style>
