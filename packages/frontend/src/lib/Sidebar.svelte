<script lang="ts">
  import PuzzleList from "./PuzzleList.svelte";

  export let onPuzzleClick: (puzzleId: string) => void | undefined;
</script>

<nav>
  <PuzzleList bind:onPuzzleClick />
</nav>

<style>
  nav {
    background: gray;
    width: 10rem;
    padding: 0.5rem;
  }
</style>
