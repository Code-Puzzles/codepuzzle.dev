<script lang="ts">
  import type { JudgeResultWithCount } from "@rttw/common-browser";

  export let result: JudgeResultWithCount | undefined = undefined;
</script>

{#if result}
  {#if result.passed}
    🎉
  {:else}
    {result.value ?? `Error: ${result.error}`}
  {/if}
{:else}
  no results
{/if}
