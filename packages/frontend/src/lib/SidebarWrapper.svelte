<script lang="ts">
  import { fly, type FlyParams } from "svelte/transition";

  // export let isOpen: boolean;
  export let shouldTransition: boolean;

  // NOTE: the `x` is linked to the width of the <Sidebar /> (set in flowbite)
  const flyParams: FlyParams = { duration: 300, x: "-16rem", opacity: 1 };
</script>

{#if shouldTransition}
  <div transition:fly={flyParams} class="z-10">
    <slot />
  </div>
{:else}
  <slot />
{/if}
