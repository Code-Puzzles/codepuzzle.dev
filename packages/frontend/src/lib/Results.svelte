<script lang="ts">
  import type { JudgeResultWithCount } from "@jspuzzles/common-browser";

  export let result: JudgeResultWithCount | undefined = undefined;
</script>

<div>
  {#if result}
    {#if result.passed}
      You returned <span class="code">true</span> 🎉
      <pre>puzzleName(TODO: solution here)</pre>
    {:else}
      {result.value ?? `Error: ${result.error}`}
    {/if}
  {:else}
    no results
  {/if}
</div>

<style>
  .code {
    font-family: monospace;
    background-color: grey;
    border-radius: 2px;
    padding: 2px;
  }
</style>
