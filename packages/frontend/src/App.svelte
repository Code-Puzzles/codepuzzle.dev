<script lang="ts">
  import Sidebar from "./lib/Sidebar.svelte";
  import CodeMirror from "./lib/CodeMirror.svelte";
  import {
    puzzles,
    type Puzzle,
    type JudgeResultWithCount,
  } from "@jspuzzles/common-browser";
  import Results from "./lib/Results.svelte";
  import Header from "./lib/Header.svelte";

  let selectedNamespace: string;
  let selectedPuzzle: string | undefined;

  let openedPuzzle: Puzzle | undefined = puzzles["season1"]![0];
  $: openedPuzzle = puzzles[selectedNamespace]?.find(
    (p) => p.name === selectedPuzzle,
  );

  let result: JudgeResultWithCount | undefined = undefined;
  let loading: boolean;
</script>

<div class="root">
  <Header {selectedNamespace} {selectedPuzzle} />
  <div class="body">
    <Sidebar bind:selectedNamespace bind:selectedPuzzle />

    <main>
      {#if openedPuzzle}
        <CodeMirror puzzle={openedPuzzle} bind:result bind:loading />
      {/if}

      {#if loading}
        checking solution...
      {:else}
        <Results bind:result />
      {/if}
    </main>
  </div>
</div>

<style>
  .root {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .body {
    display: flex;
    flex-direction: row;
    height: 100%;
  }

  main {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
</style>
