<script lang="ts">
  import { twMerge } from "tailwind-merge";
  import { type Puzzle } from "@jspuzzles/common";
  import { onMount } from "svelte";
  import { CodeMirror } from "./CodeMirror/index.js";

  export let puzzle: Puzzle | undefined = undefined;
  export let onChange = (_: string) => {};
  export let onSubmit = () => {};

  export const setValue = (value: string) => {
    if (cm && puzzle) {
      cm.setPuzzle(puzzle, onChange, onSubmit, value);
    }
  };

  let editorRoot: HTMLElement;
  let cm: CodeMirror;

  $: cm && (puzzle ? cm.setPuzzle(puzzle, onChange, onSubmit) : cm.setEmpty());

  onMount(() => {
    cm = new CodeMirror(editorRoot);
    (window as any).cm = cm;
  });
</script>

<div
  class={twMerge(
    "relative text-base border-b-2 dark:border-gray-950",
    $$props["class"],
  )}
  bind:this={editorRoot}
/>
