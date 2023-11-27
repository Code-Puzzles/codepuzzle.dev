<script lang="ts">
  import type {
    JudgeResultWithCount,
    Puzzle,
    UserState,
  } from "@jspuzzles/common";
  import CodeMirror from "./CodeMirror.svelte";
  import CodeMirrorBar from "./CodeMirrorBar.svelte";
  import Results from "./Results.svelte";
  import type { OnChangeCb } from "./CodeMirror/on-change-listener";

  export let localResult: JudgeResultWithCount | undefined = undefined;
  export let verifiedResult: JudgeResultWithCount | undefined = undefined;
  export let puzzle: Puzzle | undefined = undefined;
  export let onChange: OnChangeCb;
  export let onSubmit: () => void;
  export let submitting = false;
  export let userState: UserState;

  export let showSidebarClicked: () => void;

  let setEditorValue: ((value: string) => void) | undefined = undefined;
  let showEditorSettings: boolean;
</script>

<main class="flex flex-col flex-1 min-w-0 border-l-2 dark:border-gray-950">
  <div class="flex flex-col flex-1 min-h-0">
    <CodeMirrorBar
      {showSidebarClicked}
      configureEditorClicked={() => (showEditorSettings = true)}
      showSolutionClicked={() =>
        setEditorValue?.("TODO: render solution text into editor")}
      showSolutionDisabled={puzzle &&
        Number.isInteger(userState[puzzle.id]?.charCount)}
    />
    <CodeMirror
      class="flex-1 min-h-0"
      bind:setValue={setEditorValue}
      bind:showSettings={showEditorSettings}
      {puzzle}
      {onChange}
      {onSubmit}
    />
  </div>
  <div class="flex flex-row justify-evenly">
    <Results
      title="local"
      description="run in your browser"
      waitingMessage="Waiting for solution..."
      result={localResult}
    />
    <Results
      title="verified"
      description="verified at puzzles.js.org"
      waitingMessage="Waiting for submit..."
      loading={submitting}
      disabled={!localResult?.passed ? "solve it locally first" : false}
      result={verifiedResult}
    />
  </div>
</main>
