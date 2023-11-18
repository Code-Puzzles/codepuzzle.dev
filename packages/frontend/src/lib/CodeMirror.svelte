<script lang="ts">
  import { EditorView } from "@codemirror/view";
  import { twMerge } from "tailwind-merge";
  import { type Puzzle } from "@jspuzzles/common-browser";
  import { onMount } from "svelte";
  import { emptyEditorState, getEditorState } from "./CodeMirror";

  export let puzzle: Puzzle | undefined = undefined;
  export let onChange = (_: string) => {};
  export let onSubmit = () => {};
  export const setValue = (value: string) => {
    if (view) {
      putPuzzleIntoEditor(puzzle, value);
    }
  };

  let editorRoot: HTMLElement;
  let view: EditorView;

  $: view && putPuzzleIntoEditor(puzzle);

  function putPuzzleIntoEditor(puzzle?: Puzzle, value?: string) {
    view.setState(
      puzzle
        ? getEditorState(puzzle, onChange, onSubmit, value)
        : emptyEditorState(),
    );
    view.focus();
  }

  onMount(() => {
    // stop all other events from happening when editor is focused
    editorRoot.addEventListener("keydown", (event) => event.stopPropagation());
    // setup editor
    view = new EditorView({ parent: editorRoot });
  });
</script>

<div
  class={twMerge(
    "text-base h-full border-b-2 dark:border-gray-950",
    $$props["class"],
  )}
  bind:this={editorRoot}
/>
