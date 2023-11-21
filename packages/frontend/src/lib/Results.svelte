<script lang="ts">
  import type { JudgeResultWithCount } from "@jspuzzles/common";
  import { P, Tooltip, Spinner } from "flowbite-svelte";
  import {
    CheckCircleSolid,
    CloseCircleSolid,
    QuestionCircleSolid,
  } from "flowbite-svelte-icons";
  import ResultCell from "./ResultCell.svelte";
  import { uniqueId } from "./util";
  import GridTableRow from "./GridTableRow.svelte";

  export let result: JudgeResultWithCount | undefined = undefined;
  export let title = "";
  export let description = "";
  export let disabled: string | boolean = false;
  export let loading = false;

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
  <div
    class="text-gray-500 dark:text-gray-400 text-sm max-w-full mx-auto grid grid-cols-[auto_1fr]"
  >
    <GridTableRow title="State">
      {#if !result}
        <P class="text-gray-400 dark:text-gray-500 text-right">
          Waiting for solution...
          <QuestionCircleSolid class="inline-block" />
        </P>
      {:else if result.passed}
        <P class="text-green-400 dark:text-green-500 text-right">
          Passed
          <CheckCircleSolid class="inline-block" />
        </P>
      {:else}
        <P class="{redClass} text-right">
          Failed
          <CloseCircleSolid class="inline-block" />
        </P>
      {/if}
    </GridTableRow>
    <GridTableRow title="Value">
      <ResultCell name="Value" content={result?.value} />
    </GridTableRow>
    <GridTableRow title="Error">
      <ResultCell class={redClass} name="Error" content={result?.error} />
    </GridTableRow>
    <GridTableRow title="Characters">{result?.numChars ?? 0}</GridTableRow>
  </div>
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
