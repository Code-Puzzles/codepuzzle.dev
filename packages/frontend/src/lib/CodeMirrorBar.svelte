<script lang="ts">
  import { Button, Modal } from "flowbite-svelte";
  import {
    ChartBars3FromLeftSolid,
    ExclamationCircleSolid,
  } from "flowbite-svelte-icons";
  import { fade } from "svelte/transition";

  export let showSolutionDisabled = false;
  export let showSolutionClicked: () => void;
  export let configureEditorClicked: () => void;
  export let showSidebarClicked: () => void;

  let showDisclaimer = false;

  const divClass =
    "border-b-2 dark:border-gray-900 bg-gray-50 dark:bg-gray-800 flex flex-row justify-between py-2 px-3";
</script>

<div class={divClass}>
  <div>
    <Button size="sm" on:click={showSidebarClicked} class="md:hidden">
      <ChartBars3FromLeftSolid />
    </Button>

    <Button
      size="sm"
      on:click={() => (showDisclaimer = !showDisclaimer)}
      color="yellow"
      outline
    >
      <ExclamationCircleSolid />
      &nbsp; Things not working?
    </Button>
  </div>

  <div>
    <Button
      size="sm"
      disabled={showSolutionDisabled}
      on:click={showSolutionClicked}
      color="purple"
      outline
    >
      Show my solution
    </Button>
    <Button size="sm" on:click={configureEditorClicked} color="dark" outline>
      Editor Settings
    </Button>
  </div>
</div>

{#if showDisclaimer}
  <div transition:fade={{ duration: 300 }}>
    <Modal
      title="codepuzzle.dev isn't yet complete"
      bind:open={showDisclaimer}
      size="lg"
      autoclose
      outsideclose
    >
      Bear in mind this is not a finished product. Various things haven't been
      built out fully yet! That said, feel free to play around and try things
      out.
    </Modal>
  </div>
{/if}
