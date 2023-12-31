<script lang="ts">
  import type { UserRuntimeType } from "@codepuzzles/backend";
  import { FRONTEND_BASE_URL, GITHUB_OAUTH_MOCK_CODE } from "@codepuzzles/common";
  import {
    Navbar,
    NavBrand,
    NavLi,
    NavUl,
    DarkMode,
    NavHamburger,
    Spinner,
    Avatar,
    Dropdown,
    DropdownItem,
  } from "flowbite-svelte";
  import { SunSolid, MoonSolid, GithubSolid } from "flowbite-svelte-icons";
  import NavContainer from "flowbite-svelte/NavContainer.svelte";

  export let loggedInUser: UserRuntimeType | "loading" | undefined;
  export let onLogoutClick: () => void;

  const GITHUB_LOGIN_PATH = `${window.location.origin}/login/github`;
  const loginUrl = MOCK_LOGIN
    ? `${GITHUB_LOGIN_PATH}?code=${GITHUB_OAUTH_MOCK_CODE}`
    : `https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        redirect_uri: FRONTEND_BASE_URL,
        // TODO: Pass random state
      })}`;

  const headerClass = "w-full border-b-2 dark:border-gray-900";
  let userDropdownOpen = false;
</script>

<header class={headerClass}>
  <Navbar let:hidden fluid={true}>
    <NavContainer>
      <NavBrand href="/">
        <img src="logo.png" class="mr-3 h-6 sm:h-9" alt="logo" />
        <span
          class="self-center whitespace-nowrap text-xl font-mono dark:text-white"
        >
          codepuzzle.dev
        </span>
      </NavBrand>
      <NavHamburger />
      <NavUl
        ulClass="flex flex-col md:flex-row md:space-x-8 md:text-sm md:font-medium items-center"
      >
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
          <Avatar
            class="cursor-pointer hover:brightness-125"
            src={loggedInUser.profilePictureUrl}
            size="xs"
          />
          <Dropdown bind:open={userDropdownOpen} placement="bottom-start">
            <div slot="header" class="px-4 py-2">
              <p class="block text-sm">
                {loggedInUser.name ?? loggedInUser.loginId}
              </p>
              <p class="block text-xs font-medium text-gray-500 font-mono">
                ({loggedInUser.loginProvider})
              </p>
            </div>
            <DropdownItem
              on:click={() => {
                userDropdownOpen = false;
                onLogoutClick();
              }}
            >
              Sign Out
            </DropdownItem>
          </Dropdown>
        {:else}
          <NavLi>
            <a
              href={loginUrl}
              class="text-white bg-[#24292F] hover:bg-[#373f47] font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-centerdark:hover:bg-[#050708]/30 gap-2"
            >
              <GithubSolid class="inline-block" />
              Sign in with Github
            </a>
          </NavLi>
        {/if}
      </NavUl>
    </NavContainer>
  </Navbar>
</header>
