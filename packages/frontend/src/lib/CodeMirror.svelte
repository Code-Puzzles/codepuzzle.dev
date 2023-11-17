<script lang="ts">
  import { EditorView } from "@codemirror/view";
  import { twMerge } from "tailwind-merge";
  import {
    type Puzzle,
    type JudgeResultWithCount,
  } from "@jspuzzles/common-browser";
  import { onMount } from "svelte";
  import { emptyEditorState, getEditorState } from "./CodeMirror";
  import { evalInBrowser, submitToBackend } from "./submit";

  export let puzzle: Puzzle | undefined = undefined;

  // TODO: this submitting stuff probably shouldn't be in this component
  export let localResult: JudgeResultWithCount | undefined = undefined;
  export let verifiedResult: JudgeResultWithCount | undefined = undefined;
  export let submitting = false;

  let root: HTMLElement;
  let view: EditorView;
  let solution: string = "";

  $: view && putPuzzleIntoEditor(puzzle);

  function onChange(value: string) {
    if (!puzzle) return;
    solution = value;
    localResult = evalInBrowser(puzzle, value);
  }

  function onSubmit() {
    if (!puzzle) return;
    verifiedResult = undefined;
    submitting = true;
    submitToBackend(puzzle, solution)
      .then((r) => (verifiedResult = r))
      .finally(() => (submitting = false));
  }

  function putPuzzleIntoEditor(puzzle?: Puzzle) {
    view.setState(
      puzzle ? getEditorState(puzzle, onChange, onSubmit) : emptyEditorState(),
    );
    view.focus();
  }

  onMount(() => {
    // stop all other events from happening when editor is focused
    root.addEventListener("keydown", (event) => event.stopPropagation());
    // setup editor
    view = new EditorView({ parent: root });
  });
</script>

<div
  class={twMerge(
    "text-base h-full border-b-2 dark:border-gray-950",
    $$props["class"],
  )}
  bind:this={root}
/>
