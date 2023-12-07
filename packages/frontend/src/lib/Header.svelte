<script lang="ts">
  import type { UserRuntimeType } from "@jspuzzles/backend";
  import { FRONTEND_BASE_URL, GITHUB_OAUTH_MOCK_CODE } from "@jspuzzles/common";
  import {
    Navbar,
    NavBrand,
    NavLi,
    NavUl,
    DarkMode,
    NavHamburger,
    Spinner,
  } from "flowbite-svelte";
  import { SunSolid, MoonSolid, GithubSolid } from "flowbite-svelte-icons";
  import NavContainer from "flowbite-svelte/NavContainer.svelte";

  const GITHUB_LOGIN_PATH = `${window.location.origin}/login/github`;
  const loginUrl = MOCK_LOGIN
    ? `${GITHUB_LOGIN_PATH}?code=${GITHUB_OAUTH_MOCK_CODE}`
    : `https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        redirect_uri: FRONTEND_BASE_URL,
        // TODO: Pass random state
      })}`;

  const headerClass = "w-full border-b-2 dark:border-gray-900";

  export let loggedInUser: UserRuntimeType | "loading" | undefined;
</script>

<header class={headerClass}>
  <Navbar let:hidden fluid={true}>
    <NavContainer>
      <NavBrand href="/">
        <img src="logo.png" class="mr-3 h-6 sm:h-9" alt="logo" />
        <span
          class="self-center whitespace-nowrap text-xl font-semibold dark:text-white"
        >
          JS Puzzles
        </span>
      </NavBrand>
      <NavHamburger />
      <NavUl>
        <NavLi href="https://github.com/js-puzzles/js-puzzles.github.io">
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
        {#if loggedInUser === "loading"}
          <NavLi>
            <Spinner color="purple" size="5" />
          </NavLi>
        {:else if loggedInUser}
          <!-- TODO: dropdown with details + log out button -->
          <NavLi>Logged in as: {loggedInUser.name}</NavLi>
        {:else}
          <NavLi href={loginUrl}>Login with GitHub</NavLi>
        {/if}
      </NavUl>
    </NavContainer>
  </Navbar>
</header>
