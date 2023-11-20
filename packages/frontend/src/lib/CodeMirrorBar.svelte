<script lang="ts">
  import { Button } from "flowbite-svelte";

  export let showSolutionDisabled = false;
  export let showSolutionClicked: () => void;
</script>

<div
  class="border-b-2 dark:border-gray-950 bg-gray-50 dark:bg-gray-800 flex flex-row justify-end py-2 px-6"
>
  <Button
    disabled={showSolutionDisabled}
    on:click={showSolutionClicked}
    color="purple"
  >
    Show solution
  </Button>
</div>
