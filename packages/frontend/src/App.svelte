<script lang="ts">
  import {
    GITHUB_OAUTH_CLIENT_ID,
    puzzles,
    type Puzzle,
    type JudgeResultWithCount,
  } from "@jspuzzles/common-browser";
  import { onMount } from "svelte";
  import {
    Sidebar,
    SidebarDropdownWrapper,
    SidebarGroup,
    SidebarWrapper,
    Navbar,
    NavBrand,
    NavLi,
    NavUl,
    DarkMode,
    SidebarItem,
    Badge,
    NavHamburger,
  } from "flowbite-svelte";
  import {
    SunSolid,
    MoonSolid,
    GithubSolid,
    LightbulbSolid,
  } from "flowbite-svelte-icons";
  import CodeMirror from "./lib/CodeMirror.svelte";
  import NavContainer from "flowbite-svelte/NavContainer.svelte";
  import Results from "./lib/Results.svelte";

  let puzzle: Puzzle | undefined = puzzles["season1"]?.[0];
  let localResult: JudgeResultWithCount | undefined = undefined;
  let verifiedResult: JudgeResultWithCount | undefined = undefined;
  let submitting = false;

  function selectPuzzle(namespace: keyof typeof puzzles, puzzleId: string) {
    puzzle = puzzles[namespace]?.find((p) => p.name === puzzleId);
  }

  const GITHUB_LOGIN_PATH = "https://localhost:5173/login/github";

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

<div class="flex flex-col h-full">
  <header
    class="w-full border-b-2 dark:border-gray-950 bg-white dark:bg-slate-950"
  >
    <Navbar let:hidden fluid={true}>
      <NavContainer>
        <NavBrand href="/">
          <img src="/logo.png" class="mr-3 h-6 sm:h-9" alt="logo" />
          <span
            class="self-center whitespace-nowrap text-xl font-semibold dark:text-white"
          >
            JS Puzzles
          </span>
        </NavBrand>
        <NavHamburger />
        <NavUl>
          <NavLi href="https://github.com/js-puzzles/js-puzzles">
            <div class="flex justify-between">
              {#if !hidden}
                Open GitHub Repository
              {/if}

              <GithubSolid class="inline-block" />
            </div>
          </NavLi>
          <DarkMode
            btnClass="inline-block dark:hover:text-white hover:text-gray-900"
          >
            <svelte:fragment slot="lightIcon">
              <NavLi>
                <div class="flex justify-between">
                  {#if !hidden}
                    Toggle Dark Mode
                  {/if}

                  <MoonSolid class="inline-block" />
                </div>
              </NavLi>
            </svelte:fragment>
            <svelte:fragment slot="darkIcon">
              <NavLi>
                <div class="flex justify-between">
                  {#if !hidden}
                    Toggle Light Mode
                  {/if}

                  <SunSolid class="inline-block" />
                </div>
              </NavLi>
            </svelte:fragment>
          </DarkMode>
          <NavLi
            href="https://github.com/login/oauth/authorize?{new URLSearchParams(
              {
                client_id: GITHUB_OAUTH_CLIENT_ID,
                redirect_uri: GITHUB_LOGIN_PATH,
                // TODO: Pass random state
              },
            )}"
          >
            Login with GitHub
          </NavLi>
        </NavUl>
      </NavContainer>
    </Navbar>
  </header>

  <div class="flex grow min-h-0">
    <div
      class="border-r-2 dark:border-gray-950 overflow-y-auto bg-gray-50 dark:bg-gray-800"
    >
      <Sidebar>
        <SidebarWrapper class="rounded-none">
          <SidebarGroup>
            {#each Object.entries(puzzles) as [name, items]}
              <SidebarDropdownWrapper
                isOpen={puzzle && items.includes(puzzle)}
                class="capitalize"
                label={name}
              >
                <svelte:fragment slot="icon">
                  <LightbulbSolid />
                </svelte:fragment>

                {#each items as p}
                  <SidebarItem
                    href={`#${p.name}`}
                    label={p.name}
                    spanClass={`ml-1 grow ${p === puzzle ? "font-bold" : ""}`}
                    class={`ml-2 ${
                      p === puzzle ? "bg-gray-100 dark:bg-gray-700" : ""
                    }`}
                    on:click={() => selectPuzzle(name, p.name)}
                  >
                    <svelte:fragment slot="icon">
                      <span class="mr-2 opacity-25">•</span>
                    </svelte:fragment>
                    <svelte:fragment slot="subtext">
                      {#if p.index < 3}
                        <Badge color="green">{p.index} chars</Badge>
                      {:else if p.index < 5}
                        <Badge color="yellow">draft</Badge>
                      {/if}
                    </svelte:fragment>
                  </SidebarItem>
                {/each}
              </SidebarDropdownWrapper>
            {/each}
          </SidebarGroup>
        </SidebarWrapper>
      </Sidebar>
    </div>

    <main class="flex flex-col grow">
      <div class="grow">
        <CodeMirror
          bind:puzzle
          bind:submitting
          bind:localResult
          bind:verifiedResult
        />
      </div>
      <div class="results flex flex-row justify-evenly">
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
  </div>
</div>

<style>
  .results {
    min-height: 30%;
  }
</style>
