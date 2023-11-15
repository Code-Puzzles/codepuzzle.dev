<script lang="ts">
  import Sidebar from './lib/Sidebar.svelte';
  import CodeMirror from './lib/CodeMirror.svelte';
  import { season1, type Puzzle, type JudgeResultWithCount } from '@rttw/common-browser';
  import Results from './lib/Results.svelte';

  let openedPuzzle: Puzzle | undefined = season1[0];
  let result: JudgeResultWithCount | undefined = undefined;
  let loading: boolean;
</script>

<div class="container">
  <Sidebar
    onPuzzleClick={(puzzleId) => {
      openedPuzzle = season1.find((p) => p.name === puzzleId);
    }}
  />
  <main>
    {#if openedPuzzle}
      <CodeMirror puzzle={openedPuzzle} bind:result bind:loading />
      {#if loading}
        checking solution...
      {:else}
        <Results bind:result />
      {/if}
    {/if}
  </main>
</div>

<style>
  .container {
    display: flex;
  }

  main {
    flex-grow: 1;
    margin: 0.5rem;
  }
</style>
