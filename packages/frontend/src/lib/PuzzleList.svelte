<script lang="ts">
  // TODO: get this from backend with fetch
  import { season1 } from "@rttw/common-browser";

  export let onPuzzleClick: (puzzleId: string) => void | undefined;

  // TODO: move to common and fetch from backend
  interface UserState {
    puzzlesSolved: Record<string, { count: number }>;
  }
  const userState: UserState = {
    puzzlesSolved: {
      id: { count: 2 },
      reflexive: { count: 4 },
      counter: { count: 4 },
    },
  };
</script>

<ul class="list">
  {#each season1 as puzzle}
    {@const userPuzzle = userState.puzzlesSolved[puzzle.name]}
    <li>
      <a
        on:click={() => onPuzzleClick?.(puzzle.name)}
        role="button"
        tabindex="-1"
        href={`#${puzzle.name}`}
      >
        <input type="checkbox" checked={!!userPuzzle} />
        {puzzle.name}
        {#if userPuzzle}
          <span class="count">({userPuzzle.count})</span>
        {/if}
      </a>
    </li>
  {/each}
</ul>

<style>
  a:visited,
  a {
    text-decoration: none;
    color: black;
  }
  .list {
    list-style-type: none;
    padding-left: 0;
  }
  .count {
    color: lightgrey;
  }
</style>
