<script lang="ts">
  import { Button } from "flowbite-svelte";
  import { ChartBars3FromLeftSolid } from "flowbite-svelte-icons";

  export let showSolutionDisabled = false;
  export let showSolutionClicked: () => void;
  export let configureEditorClicked: () => void;
  export let showSidebarClicked: () => void;

  const divClass =
    "border-b-2 dark:border-gray-900 bg-gray-50 dark:bg-gray-800 flex flex-row justify-between py-2 px-3";
</script>

<div class={divClass}>
  <div>
    <Button size="sm" on:click={showSidebarClicked} class="md:hidden">
      <ChartBars3FromLeftSolid />
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
