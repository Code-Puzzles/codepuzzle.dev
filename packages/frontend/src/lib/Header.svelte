<script lang="ts">
  export let selectedNamespace: string | undefined;
  export let selectedPuzzle: string | undefined;
  // TODO: use this to toggle dark mode (+ save to local storage)
  export let darkMode: boolean = true;

  function toggleDarkMode() {
    darkMode = !darkMode;
  }
</script>

<header>
  <div class="title">
    <img src="/logo.png" alt="logo" />
    <h1>JS Puzzles</h1>
  </div>

  {#if selectedNamespace && selectedPuzzle}
    <span>{selectedNamespace} - {selectedPuzzle}</span>
  {/if}

  <div class="rest">
    <button on:click={toggleDarkMode}>
      {#if darkMode}
        ☀️
      {:else}
        🌙
      {/if}
    </button>
  </div>
</header>

<style>
  header {
    padding: 1em;
    background-color: black;
    color: white;
    border-bottom: 1px solid grey;

    display: flex;
    justify-content: space-between;
  }

  div.title {
    display: flex;
  }

  div.title img {
    display: inline-block;
    position: relative;
    height: 2em;
    margin-top: -1em;
    margin-right: 0.5em;
    top: 0.5em;
  }

  header span {
    font-style: italic;
    font-family: monospace;
  }
</style>
