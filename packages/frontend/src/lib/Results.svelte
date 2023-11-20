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
  import ResultCell from "./ResultCell.svelte";
  import { uniqueId } from "./util";

  export let result: JudgeResultWithCount | undefined = undefined;
  export let title = "";
  export let description = "";
  export let disabled: string | boolean = false;
  export let loading = false;

  const thProps = { width: "30%" };
  const tdProps = { class: "flex justify-end font-mono" };
  const redClass = "text-red-700 dark:text-red-500";
  const id = uniqueId();
</script>

<div class="wrapper relative dark:border-gray-950">
  <P {id} weight="semibold" class="w-full text-center">{title}</P>
  {#if description}
    <Tooltip triggeredBy={`#${id}`}>{description}</Tooltip>
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
        <ResultCell {...tdProps} name="Value" content={result?.value} />
      </TableBodyRow>
      <TableBodyRow>
        <TableHeadCell {...thProps}>Error</TableHeadCell>
        <ResultCell
          {...tdProps}
          class={twMerge(redClass, tdProps.class)}
          name="Error"
          content={result?.error}
        />
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
