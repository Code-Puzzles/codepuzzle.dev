<script lang="ts">
  import { Button } from "flowbite-svelte";

  export let showSolutionDisabled = false;
  export let showSolutionClicked: () => void;
</script>

<span class="hidden opacity-50">
  <!--
    FIXME: this exists because for some reason tailwind doesn't include the classes that
    flowbite-svelte uses on <Button /> and <ButtonGroup /> components. Listing them
    manually here works so they get included...
  -->
</span>

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
