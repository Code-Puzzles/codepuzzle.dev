<script lang="ts">
  import { Button, Modal, TableBodyCell } from "flowbite-svelte";

  export let name: string;
  // TODO: can I prevent this from getting put as an attribute in the dom? (would slow it down and make this cmp useless)
  export let content: string | undefined = undefined;

  const maxLength = 60;

  let textPreview: string | undefined;
  $: textPreview = content ? truncate(content) : undefined;

  function truncate(input: string) {
    if (input.length > maxLength) {
      return input.substring(0, maxLength) + " (truncated)";
    }

    return input;
  }

  let hover = false;
  let modal = false;
</script>

<TableBodyCell {...$$props}>
  <!-- TODO -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- FIXME: this truncates properly, but it makes its parent's width expand and overflows the table, make it not do that -->
  <div
    style="max-width: 35%"
    class="w-full text-right truncate"
    class:cursor-pointer={textPreview !== undefined}
    role="button"
    tabindex="0"
    on:mouseenter={() => (hover = true)}
    on:mouseleave={() => (hover = false)}
    on:click={() => (modal = content ? true : false)}
  >
    {#if textPreview !== undefined && hover}
      <span class="italic font-bold text-gray-400">click to expand</span>
    {:else if textPreview !== undefined}
      {textPreview}
    {:else}
      <span class="italic text-gray-500">&lt;empty&gt;</span>
    {/if}
  </div>
  {#if content && modal}
    <Modal title={name} bind:open={modal} size="lg" autoclose outsideclose>
      <pre>{content}</pre>
      <svelte:fragment slot="footer">
        <Button color="alternative">Close</Button>
      </svelte:fragment>
    </Modal>
  {/if}
</TableBodyCell>
