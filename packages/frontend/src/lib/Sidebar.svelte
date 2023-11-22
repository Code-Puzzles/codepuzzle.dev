<script lang="ts">
  import { puzzles, type Puzzle } from "@jspuzzles/common";
  import {
    Sidebar,
    SidebarDropdownWrapper,
    SidebarGroup,
    SidebarWrapper,
    SidebarItem,
    Badge,
  } from "flowbite-svelte";
  import { LightbulbSolid } from "flowbite-svelte-icons";

  export let puzzle: Puzzle | undefined = undefined;
  export let selectPuzzle: (namespace: string, puzzleName: string) => void;
</script>

<!-- NOTE: the `direction` styles are to position the scrollbar on the left -->
<div
  class="border-r-2 dark:border-gray-950 overflow-y-auto bg-gray-50 dark:bg-gray-800"
  style="direction: rtl;"
>
  <div style="direction: ltr;">
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
                  spanClass={`ml-1 flex-1 ${p === puzzle ? "font-bold" : ""}`}
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
</div>
