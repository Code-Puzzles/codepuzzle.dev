<script lang="ts">
  import { Button, Modal, Tooltip } from "flowbite-svelte";
  import { uniqueId } from "./util";
  import { twMerge } from "tailwind-merge";

  export let name: string;
  export let content: string | undefined = undefined;

  const maxLength = 500;

  let textPreview: string | undefined;
  $: textPreview = content ? truncate(content) : undefined;

  function truncate(input: string) {
    if (input.length > maxLength) {
      return input.substring(0, maxLength) + " (truncated)";
    }

    return input;
  }

  let modal = false;
  const id = uniqueId();
</script>

<button
  class={twMerge(
    "w-full text-right truncate",
    textPreview !== undefined ? "cursor-pointer" : "cursor-text",
    $$props["class"],
  )}
  tabindex="0"
  on:click={() => (modal = content ? true : false)}
>
  {#if textPreview !== undefined}
    <Tooltip triggeredBy={`#${id}`} class="z-10"
      >click to see entire value</Tooltip
    >
    <span {id} class="hover:text-purple-500">{textPreview}</span>
  {:else}
    <span class="italic text-gray-500">&lt;empty&gt;</span>
  {/if}
</button>
{#if content && modal}
  <Modal title={name} bind:open={modal} size="lg" autoclose outsideclose>
    <pre
      class="p-2 font-mono rounded border-2 dark:border-gray-950 text-left backdrop-brightness-75">{content}</pre>
    <svelte:fragment slot="footer">
      <Button class="dark:hover:bg-gray-900" color="alternative">Close</Button>
    </svelte:fragment>
  </Modal>
{/if}
