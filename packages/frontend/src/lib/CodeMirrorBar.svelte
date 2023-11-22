<script lang="ts">
  import { Button } from "flowbite-svelte";
  import { ChartBars3FromLeftSolid } from "flowbite-svelte-icons";

  export let showSolutionDisabled = false;
  export let showSolutionClicked: () => void;

  export let showSidebarClicked: () => void;
</script>

<div
  class="border-b-2 dark:border-gray-950 bg-gray-50 dark:bg-gray-800 flex flex-row justify-between py-2 px-3"
>
  <div>
    <Button on:click={showSidebarClicked} class="md:hidden">
      <ChartBars3FromLeftSolid />
    </Button>
  </div>
  <Button
    disabled={showSolutionDisabled}
    on:click={showSolutionClicked}
    color="purple"
  >
    Show solution
  </Button>
</div>
