<script lang="ts">
  import {
    type Puzzle,
    PuzzleGroup,
    puzzlesInGroups,
    type UserState,
  } from "@jspuzzles/common";
  import {
    Sidebar,
    SidebarDropdownWrapper,
    SidebarGroup,
    SidebarWrapper,
    SidebarItem,
    Badge,
  } from "flowbite-svelte";
  import { LightbulbSolid } from "flowbite-svelte-icons";
  import { twMerge } from "tailwind-merge";
  import { drafts } from "./stores";

  export let puzzle: Puzzle | undefined = undefined;
  export let selectPuzzle: (puzzleName: string) => void;
  export let isOpen: boolean;
  export let userState: UserState;
</script>

{#if isOpen}
  <!-- NOTE: the `direction` styles are to position the scrollbar on the left -->
  <div
    class={twMerge(
      "[position:absolute] md:[position:initial] h-full border-r-2 md:border-r-0 dark:border-gray-950 overflow-y-auto bg-gray-50 dark:bg-gray-800",
      $$props["class"],
    )}
    style="direction: rtl;"
  >
    <div style="direction: ltr;">
      <Sidebar>
        <SidebarWrapper class="rounded-none">
          <SidebarGroup>
            {#each Object.values(PuzzleGroup) as group}
              {@const puzzles = puzzlesInGroups[group]}
              {#if puzzles.length}
                <SidebarDropdownWrapper
                  class="capitalize"
                  label="{group} ({puzzles.filter(
                    (p) => userState[p.id]?.charCount,
                  ).length} / {puzzles.length})"
                  isOpen={!!puzzlesInGroups[group].find(
                    (other) => puzzle?.id === other.id,
                  )}
                >
                  <svelte:fragment slot="icon">
                    <LightbulbSolid />
                  </svelte:fragment>

                  {#each puzzles as p}
                    <SidebarItem
                      href={`#${p.id}`}
                      label={p.name}
                      spanClass={`ml-1 flex-1 ${
                        p === puzzle ? "font-bold" : ""
                      }`}
                      class={`ml-2 ${
                        p === puzzle ? "bg-gray-100 dark:bg-gray-700" : ""
                      }`}
                      on:click={() => selectPuzzle(p.id)}
                    >
                      <svelte:fragment slot="icon">
                        <span class="mr-2 opacity-25">•</span>
                      </svelte:fragment>
                      <svelte:fragment slot="subtext">
                        {@const state = userState[p.id]}
                        {@const draft = $drafts[p.id]}
                        {#if state && state.charCount}
                          <Badge color="green">{state.charCount} chars</Badge>
                        {:else if draft?.solution}
                          <Badge color="yellow">draft</Badge>
                        {/if}
                      </svelte:fragment>
                    </SidebarItem>
                  {/each}
                </SidebarDropdownWrapper>
              {/if}
            {/each}
          </SidebarGroup>
        </SidebarWrapper>
      </Sidebar>
    </div>
  </div>
{/if}
