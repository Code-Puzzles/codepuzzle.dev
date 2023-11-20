<script lang="ts">
  import type { JudgeResultWithCount } from "@jspuzzles/common";
  import {
    Table,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    P,
    Tooltip,
    Spinner,
  } from "flowbite-svelte";
  import {
    CheckCircleSolid,
    CloseCircleSolid,
    QuestionCircleSolid,
  } from "flowbite-svelte-icons";
  import { twMerge } from "tailwind-merge";

  export let result: JudgeResultWithCount | undefined = undefined;
  export let title = "";
  export let description = "";
  export let disabled: string | boolean = false;
  export let loading = false;

  const thProps = { width: "30%" };
  const tdProps = { class: "flex justify-end font-mono" };
  const redClass = "text-red-700 dark:text-red-500";
  const uniqueId = `id-${Math.floor(Math.random() * 1337)}`;
</script>

<div class="wrapper relative dark:border-gray-950">
  <P id={uniqueId} weight="semibold" class="w-full text-center">{title}</P>
  {#if description}
    <Tooltip triggeredBy={`#${uniqueId}`}>{description}</Tooltip>
  {/if}
  {#if disabled || loading}
    <div
      class="absolute top-0 left-0 right-0 bottom-0 z-10 flex flex-col justify-center items-center backdrop-brightness-75 backdrop-blur-sm"
    >
      {#if disabled}
        <P>{disabled}</P>
      {:else if loading}
        <Spinner class="inline-block" color="purple" />
        <P>waiting...</P>
      {/if}
    </div>
  {/if}
  <!-- TODO: truncate long responses in this table, have tooltip and on:click to open modal with full result -->
  <Table>
    <TableBody>
      <TableBodyRow>
        <TableHeadCell {...thProps} width="30%">State</TableHeadCell>
        <TableBodyCell {...tdProps}>
          {#if !result}
            <P class="text-gray-400 dark:text-gray-500">
              Waiting for solution...
              <QuestionCircleSolid class="inline-block" />
            </P>
          {:else if result.passed}
            <P class="text-green-400 dark:text-green-500">
              Passed
              <CheckCircleSolid class="inline-block" />
            </P>
          {:else}
            <P class={redClass}>
              Failed
              <CloseCircleSolid class="inline-block" />
            </P>
          {/if}
        </TableBodyCell>
      </TableBodyRow>
      <TableBodyRow>
        <TableHeadCell {...thProps}>Value</TableHeadCell>
        <TableBodyCell {...tdProps}>
          {result && "value" in result ? result.value : "-"}
        </TableBodyCell>
      </TableBodyRow>
      <TableBodyRow>
        <TableHeadCell {...thProps}>Error</TableHeadCell>
        {#if result?.error}
          <TableBodyCell {...tdProps} class={twMerge(redClass, tdProps.class)}
            >{result.error}</TableBodyCell
          >
        {:else}
          <TableBodyCell {...tdProps}>-</TableBodyCell>
        {/if}
      </TableBodyRow>
      <TableBodyRow>
        <TableHeadCell {...thProps}>Characters</TableHeadCell>
        <TableBodyCell {...tdProps}>
          {result?.numChars ?? 0}
        </TableBodyCell>
      </TableBodyRow>
    </TableBody>
  </Table>
</div>

<style>
  .wrapper {
    min-width: 50%;
    max-width: 50%;
    border-width: 2px;
    border-top-width: 0;
    border-left-width: 0;
  }
</style>
