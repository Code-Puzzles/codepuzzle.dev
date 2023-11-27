<script lang="ts">
  import { twMerge } from "tailwind-merge";
  import { type Puzzle } from "@jspuzzles/common";
  import { onMount } from "svelte";
  import { CodeMirror } from "./CodeMirror/index.js";
  import { Button, Input, Label, Modal, P } from "flowbite-svelte";
  import { fade } from "svelte/transition";
  import { defaultEditorSettings, drafts, editorSettings } from "./stores.js";
  import type { OnChangeCb } from "./CodeMirror/on-change-listener.js";

  export let puzzle: Puzzle | undefined = undefined;
  export let onChange: OnChangeCb = () => {};
  export let onSubmit = () => {};
  export let showSettings = false;

  export const setValue = (value: string) => cm?.setSolution(value);

  let editorRoot: HTMLElement;
  let cm: CodeMirror;

  // NOTE: we only want to update the puzzle when `puzzle` changes, so make sure
  // we don't unintentionally reference `cm` in a reactive statement.
  $: puzzle, setPuzzle();
  const setPuzzle = () => {
    if (puzzle) {
      const draft = $drafts[puzzle.id];
      cm?.setPuzzle(
        puzzle,
        onChange,
        onSubmit,
        draft?.solution,
        draft?.selection,
      );
    } else {
      cm?.setEmpty();
    }
  };

  const applyEditorSettings = () => {
    if (!cm) return;

    if (cm.indentSize !== +$editorSettings.indentSize) {
      cm.indentSize = +$editorSettings.indentSize;
    }

    if (cm.cursorLineMargin !== +$editorSettings.cursorLineMargin) {
      cm.cursorLineMargin = +$editorSettings.cursorLineMargin;
    }

    cm.focus();
  };

  const setNumberValue = (fn: (n: number) => void) => (e: Event) => {
    const n = (e.target as HTMLInputElement).valueAsNumber;
    if (!isNaN(n)) fn(n);
  };

  onMount(() => {
    (window as any).cm = cm = new CodeMirror(editorRoot, $editorSettings);
    setPuzzle();
  });
</script>

<div
  class={twMerge(
    "relative text-base border-b-2 dark:border-gray-950",
    $$props["class"],
  )}
  bind:this={editorRoot}
/>
<!-- TODO: wrap all modals in the same transition div (with same z-index, etc) -->
{#if showSettings}
  <div transition:fade={{ duration: 300 }} class="z-20">
    <Modal
      title="Editor Settings"
      bind:open={showSettings}
      on:close={applyEditorSettings}
      size="lg"
      autoclose
      outsideclose
    >
      <form>
        <div class="grid gap-6 mb-6 md:grid-cols-2">
          <div>
            <Label class="mb-2">Indent Size</Label>
            <Input
              type="number"
              min="2"
              max="16"
              value={$editorSettings.indentSize}
              on:change={setNumberValue(
                (n) => ($editorSettings.indentSize = n),
              )}
            />
            <P class="text-gray-500 dark:text-gray-500">
              The width of a tab character (or how many spaces make up an
              indent).
            </P>
          </div>
          <div>
            <Label class="mb-2">Cursor Line Margin</Label>
            <Input
              type="number"
              min="1"
              max="8"
              value={$editorSettings.cursorLineMargin}
              on:change={setNumberValue(
                (n) => ($editorSettings.cursorLineMargin = n),
              )}
            />
            <P class="text-gray-500 dark:text-gray-500">
              How many extra lines to always keep above and below the cursor
              when approaching the top or bottom of the visible view in the
              editor.
            </P>
          </div>
        </div>
      </form>

      <P class="text-center text-gray-500 dark:text-gray-500">
        Settings are saved as you make them
      </P>
      <svelte:fragment slot="footer">
        <Button
          type="submit"
          class="dark:hover:bg-gray-900"
          color="alternative"
        >
          Done
        </Button>
        <Button
          color="red"
          outline
          on:click={() => ($editorSettings = defaultEditorSettings())}
        >
          Reset to defaults
        </Button>
      </svelte:fragment>
    </Modal>
  </div>
{/if}
