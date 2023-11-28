<script lang="ts">
  import { Button, Modal, Tooltip } from "flowbite-svelte";
  import { uniqueId } from "./util";
  import { twMerge } from "tailwind-merge";
  import { fade } from "svelte/transition";

  export let name: string;
  export let content: string | undefined = undefined;

  const preClass =
    "p-2 font-mono rounded border-2 dark:border-gray-900 text-left backdrop-brightness-75";
  const maxLength = 500;
  const id = uniqueId();
  let modal = false;

  let textPreview: string | undefined;
  $: textPreview = content ? truncate(content) : undefined;

  function truncate(input: string) {
    if (input.length > maxLength) {
      return input.substring(0, maxLength) + " (truncated)";
    }

    return input;
  }
</script>

<div id="{id}-ref">
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
      <Tooltip reference="#{id}-ref" triggeredBy="#{id}" class="z-10">
        click to see entire value
      </Tooltip>
      <span {id} class="hover:text-purple-500">{textPreview}</span>
    {:else}
      <span class="italic text-gray-500">&lt;empty&gt;</span>
    {/if}
  </button>
</div>

{#if content && modal}
  <div transition:fade={{ duration: 300 }} class="z-20">
    <Modal title={name} bind:open={modal} size="lg" autoclose outsideclose>
      <pre class={preClass}>{content}</pre>

      <svelte:fragment slot="footer">
        <Button class="dark:hover:bg-gray-900" color="alternative">
          Close
        </Button>
      </svelte:fragment>
    </Modal>
  </div>
{/if}

<style>
  pre {
    white-space: pre-wrap;
  }
</style>
