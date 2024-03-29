<script lang="ts">
  import {
    puzzles,
    type Puzzle,
    type JudgeResultWithCount,
    puzzlesAsMap,
    type UserState,
  } from "@codepuzzles/common";
  import type { UserRuntimeType } from "@codepuzzles/backend";
  import { onMount } from "svelte";
  import { evalInBrowser, submitToBackend } from "./lib/submit";
  import Sidebar from "./lib/Sidebar.svelte";
  import Workspace from "./lib/Workspace.svelte";
  import Header from "./lib/Header.svelte";
  import { responsiveBreakpointPixels } from "./lib/util";
  import { fade } from "svelte/transition";
  import SidebarWrapper from "./lib/SidebarWrapper.svelte";
  import { drafts } from "./lib/stores";
  import type { OnChangeCb } from "./lib/CodeMirror/on-change-listener";

  let puzzle: Puzzle | undefined =
    puzzlesAsMap[window.location.hash.substring(1)] ?? puzzles[0];

  let localResult: JudgeResultWithCount | undefined = undefined;
  let verifiedResult: JudgeResultWithCount | undefined = undefined;
  let submitting = false;
  let solution = "";

  let loggedInUser: UserRuntimeType | "loading" | undefined = undefined;
  // TODO: get from backend
  const userState: UserState = {
    [puzzles[0]!.id]: { charCount: 2 },
  };
  const refreshLoginState = async () => {
    loggedInUser = "loading";
    const res = await fetch(`${API_BASE_URL}/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    });
    const { user } = (await res.json()) as { user?: UserRuntimeType };
    loggedInUser = user;
  };

  let evalPromise: Promise<JudgeResultWithCount> | null = null;
  const onChange: OnChangeCb = (value, selection) => {
    if (!puzzle) return;

    // eval locally
    solution = value.trim();
    if (solution) {
      const curr = (evalPromise = evalInBrowser(puzzle, solution));
      curr.then((result) => {
        if (evalPromise === curr) {
          localResult = result;
          $drafts[puzzle!.id] = { solution, selection: selection.toJSON() };
        }
      });
    } else {
      localResult = undefined;
    }
  };

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

  async function login(code: string) {
    try {
      await fetch(`${API_BASE_URL}/login/github`, {
        method: "POST",
        body: JSON.stringify({ oauthCode: code }),
        credentials: "include",
      });
    } finally {
      history.replaceState(null, "", "/");
      await refreshLoginState();
    }
  }

  function logout() {
    fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "include",
    }).finally(() => refreshLoginState());
  }

  onMount(async () => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return await refreshLoginState();

    loggedInUser = "loading";
    await login(code);
  });
</script>

<svelte:window bind:innerWidth={width} />
<div class="flex flex-col h-full">
  <Header {loggedInUser} onLogoutClick={() => logout()} />

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
