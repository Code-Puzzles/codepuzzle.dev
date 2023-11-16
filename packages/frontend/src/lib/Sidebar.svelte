<script lang="ts">
  import { puzzles, type Puzzle } from "@jspuzzles/common-browser";
  import RadioGroup from "./RadioGroup.svelte";
  import type { RadioGroupOption } from "./RadioGroup";
  import PuzzlePill from "./PuzzlePill.svelte";

  export let selectedNamespace: string;
  export let selectedPuzzle: string | undefined;

  const namespaceOptions: RadioGroupOption[] = Object.keys(puzzles).map(
    (namespace) => ({
      value: namespace,
      // FIXME: the pill for these should be a count of solved puzzles, e.g.: `$solvedCount of $totalCount`
      label: {
        component: PuzzlePill,
        pillAppearance: "subtle",
        pillText: `n of ${puzzles[namespace]!.length}`,
        text: namespace,
      },
    }),
  );

  let puzzleOptions: RadioGroupOption[] = [];

  $: selectedNamespace &&
    (puzzleOptions = puzzles[selectedNamespace]!.map((puzzle, i) => ({
      value: puzzle.name,
      label: getComponent(puzzle, i),
    })));
  $: puzzleOptions, (selectedPuzzle = getSelectedPuzzle());

  function getComponent(puzzle: Puzzle, i: number) {
    const solved = i < 3;
    return {
      component: PuzzlePill,
      pillAppearance: solved ? "complete" : "subtle",
      pillText: solved ? `${i} bytes` : "unsolved",
      text: puzzle.name,
    };
  }

  function getSelectedPuzzle() {
    if (puzzleOptions.find((opt) => opt.value === selectedPuzzle)) {
      return selectedPuzzle;
    }

    // TODO: find first unsolved puzzle once we have user types
    return puzzleOptions?.[0]?.value;
  }
</script>

<div class="sidebar">
  <RadioGroup
    title="Select Group"
    options={namespaceOptions}
    bind:selected={selectedNamespace}
  />

  <RadioGroup
    title="Select Puzzle"
    options={puzzleOptions}
    bind:selected={selectedPuzzle}
  />
</div>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    padding-top: 1em;
    padding-bottom: 1em;
    padding-left: 2em;
    padding-right: 4em;
    min-width: 200px;
    border-right: 1px solid grey;
  }
</style>
