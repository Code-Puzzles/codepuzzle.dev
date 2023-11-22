<script lang="ts">
  import type { JudgeResultWithCount, Puzzle } from "@jspuzzles/common";
  import CodeMirror from "./CodeMirror.svelte";
  import CodeMirrorBar from "./CodeMirrorBar.svelte";
  import Results from "./Results.svelte";

  export let localResult: JudgeResultWithCount | undefined = undefined;
  export let verifiedResult: JudgeResultWithCount | undefined = undefined;
  export let puzzle: Puzzle | undefined = undefined;
  export let onChange: (value: string) => void;
  export let onSubmit: () => void;
  export let submitting = false;

  let setEditorValue: ((value: string) => void) | undefined = undefined;
</script>

<main class="flex flex-col flex-1 min-w-0">
  <div class="flex flex-col flex-1 min-h-0">
    <CodeMirrorBar
      showSolutionClicked={() =>
        setEditorValue?.("TODO: render solution text into editor")}
      showSolutionDisabled={puzzle ? puzzle.index > 3 : false}
    />
    <CodeMirror
      class="flex-1 min-h-0"
      bind:puzzle
      bind:setValue={setEditorValue}
      {onChange}
      {onSubmit}
    />
  </div>
  <div class="flex flex-row justify-evenly">
    <Results
      title="local"
      description="run in your browser"
      bind:result={localResult}
    />
    <Results
      title="verified"
      description="verified at puzzles.js.org"
      loading={submitting}
      disabled={!localResult?.passed ? "solve it locally first" : false}
      bind:result={verifiedResult}
    />
  </div>
</main>
