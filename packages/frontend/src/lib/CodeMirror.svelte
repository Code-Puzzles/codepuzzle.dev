<script lang="ts">
  import { EditorView } from '@codemirror/view';
  import { season1, type Puzzle, type JudgeResultWithCount } from '@rttw/common-browser';
  import { onMount } from 'svelte';
  import { getEditorState } from './CodeMirror';
  import { evalInBrowser, submitToBackend } from './submit';

  export let puzzle: Puzzle = season1[0]!;
  export let result: JudgeResultWithCount | undefined = undefined;

  let root: HTMLElement;
  let view: EditorView;
  let solution: string = '';

  $: view && putPuzzleIntoEditor(puzzle);

  function onChange(value: string) {
    solution = value;
    result = evalInBrowser(puzzle, value);
  }

  function onSubmit() {
    result = undefined;
    submitToBackend(puzzle, solution).then((r) => (result = r));
  }

  function putPuzzleIntoEditor(puzzle: Puzzle) {
    view.setState(getEditorState(puzzle, onChange, onSubmit));
    view.focus();
  }

  onMount(() => {
    // stop all other events from happening when editor is focused
    root.addEventListener('keydown', (event) => event.stopPropagation());
    // setup editor
    view = new EditorView({ parent: root });
  });
</script>

<div class="editor" bind:this={root} />

<style>
  .editor {
    background: white;
    color: black;
    border: 1px solid red;
  }
</style>