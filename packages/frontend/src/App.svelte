<script lang="ts">
  import {
    puzzles,
    type Puzzle,
    type JudgeResultWithCount,
    puzzlesAsMap,
    type UserState,
  } from "@jspuzzles/common";
  import { onMount } from "svelte";
  import { evalInBrowser, submitToBackend } from "./lib/submit";
  import Sidebar from "./lib/Sidebar.svelte";
  import Workspace from "./lib/Workspace.svelte";
  import Header from "./lib/Header.svelte";
  import { responsiveBreakpointPixels } from "./lib/util";
  import { fade } from "svelte/transition";
  import SidebarWrapper from "./lib/SidebarWrapper.svelte";

  let puzzle: Puzzle | undefined =
    puzzlesAsMap[window.location.hash.substring(1)] ?? puzzles[0];

  let localResult: JudgeResultWithCount | undefined = undefined;
  let verifiedResult: JudgeResultWithCount | undefined = undefined;
  let submitting = false;
  let solution = "";

  // TODO: get from backend
  const userState: UserState = {
    [puzzles[0]!.id]: { charCount: 2 },
    [puzzles[1]!.id]: { draft: true },
  };

  function onChange(value: string) {
    if (!puzzle) return;
    solution = value.trim();
    localResult = solution ? evalInBrowser(puzzle, solution) : undefined;
  }

  function onSubmit() {
    if (!puzzle) return;
    verifiedResult = undefined;
    submitting = true;
    submitToBackend(puzzle, solution)
      .then((r) => (verifiedResult = r))
      .finally(() => (submitting = false));
  }

  function selectPuzzle(puzzleId: string) {
    puzzle = puzzlesAsMap[puzzleId];
    sidebarOpen = false;
  }

  let width: number;
  let sidebarOpen = false;
  $: if (width >= responsiveBreakpointPixels) {
    sidebarOpen = false;
  }

  onMount(async () => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;

    try {
      await fetch("/api/login/github", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    } finally {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("code");
      history.replaceState(null, "", newUrl);
    }
  });
</script>

<svelte:window bind:innerWidth={width} />
<div class="flex flex-col h-full">
  <Header />

  <div class="relative flex flex-1 min-h-0">
    <SidebarWrapper
      shouldTransition={sidebarOpen && width < responsiveBreakpointPixels}
    >
      <Sidebar
        class={sidebarOpen ? "z-10" : ""}
        isOpen={width >= responsiveBreakpointPixels || sidebarOpen}
        {userState}
        {selectPuzzle}
        {puzzle}
      />
    </SidebarWrapper>

    <Workspace
      showSidebarClicked={() => (sidebarOpen = !sidebarOpen)}
      {userState}
      {puzzle}
      {submitting}
      {onChange}
      {onSubmit}
      {localResult}
      {verifiedResult}
    />

    {#if sidebarOpen}
      <div
        role="presentation"
        class="absolute top-0 left-0 right-0 bottom-0 backdrop-blur-md"
        transition:fade={{ duration: 300 }}
        on:click={() => (sidebarOpen = false)}
      />
    {/if}
  </div>
</div>
