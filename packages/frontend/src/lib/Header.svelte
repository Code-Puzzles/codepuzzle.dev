<script lang="ts">
  import { GITHUB_OAUTH_CLIENT_ID } from "@jspuzzles/common";
  import {
    Navbar,
    NavBrand,
    NavLi,
    NavUl,
    DarkMode,
    NavHamburger,
  } from "flowbite-svelte";
  import { SunSolid, MoonSolid, GithubSolid } from "flowbite-svelte-icons";
  import NavContainer from "flowbite-svelte/NavContainer.svelte";

  const GITHUB_LOGIN_PATH = "https://localhost:5173/login/github";
</script>

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
          href="https://github.com/login/oauth/authorize?{new URLSearchParams({
            client_id: GITHUB_OAUTH_CLIENT_ID,
            redirect_uri: GITHUB_LOGIN_PATH,
            // TODO: Pass random state
          })}"
        >
          Login with GitHub
        </NavLi>
      </NavUl>
    </NavContainer>
  </Navbar>
</header>
