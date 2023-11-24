<script lang="ts">
  import { twMerge } from "tailwind-merge";
  import { type Puzzle } from "@jspuzzles/common";
  import { onMount } from "svelte";
  import { CodeMirror } from "./CodeMirror/index.js";
  import { Button, Input, Label, Modal, P } from "flowbite-svelte";
  import { fade } from "svelte/transition";

  export let puzzle: Puzzle | undefined = undefined;
  export let onChange = (_: string) => {};
  export let onSubmit = () => {};
  export let showSettings = false;

  export const setValue = (value: string) => cm?.setSolution(value);

  let editorRoot: HTMLElement;
  let cm: CodeMirror;
  $: cm && (puzzle ? cm.setPuzzle(puzzle, onChange, onSubmit) : cm.setEmpty());
  $: showSettings && fetchEditorSettings();

  const settings = {
    tabSize: "",
    cursorLineMargin: "",
  } satisfies Record<string, string>;

  const fetchEditorSettings = () => {
    if (cm) {
      settings.tabSize = `${cm.tabSize}`;
      settings.cursorLineMargin = `${cm.cursorLineMargin}`;
    }
  };

  const applyEditorSettings = () => {
    const tabSize = +settings.tabSize;
    const cursorLineMargin = +settings.cursorLineMargin;

    if (cm.tabSize !== tabSize) {
      cm.tabSize = tabSize;
    }
    if (cm.cursorLineMargin !== cursorLineMargin) {
      cm.cursorLineMargin = cursorLineMargin;
    }

    cm.focus();
  };

  onMount(() => {
    (window as any).cm = cm = new CodeMirror(editorRoot);
    fetchEditorSettings();
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
      size="lg"
      autoclose
      outsideclose
    >
      <form>
        <div class="grid gap-6 mb-6 md:grid-cols-2">
          <div>
            <Label class="mb-2">Tab Size</Label>
            <Input
              type="number"
              min="2"
              max="16"
              placeholder={cm?.tabSize}
              bind:value={settings.tabSize}
            />
            <P class="text-gray-500 dark:text-gray-500"
              >The width of a tab character.</P
            >
          </div>
          <div>
            <Label class="mb-2">Cursor Line Margin</Label>
            <Input
              type="number"
              min="1"
              placeholder={cm?.cursorLineMargin}
              bind:value={settings.cursorLineMargin}
            />
            <P class="text-gray-500 dark:text-gray-500">
              How many extra lines to always keep above and below the cursor
              when approaching the top or bottom of the visible view in the
              editor.
            </P>
          </div>
        </div>
      </form>

      <svelte:fragment slot="footer">
        <Button type="submit" color="purple" on:click={applyEditorSettings}>
          Save
        </Button>
        <Button class="dark:hover:bg-gray-900" color="alternative">
          Close
        </Button>
      </svelte:fragment>
    </Modal>
  </div>
{/if}
