<script lang="ts">
  import { nextId, type RadioGroupOption } from "./RadioGroup";

  // https://svelte.dev/repl/a1c9e4be23d746ddba6b7d62d4aad875?version=3.35.0

  export let options: RadioGroupOption[] = [];
  export let title: string;
  export let selected = options[0]?.value;

  const radioGroupId = nextId();
</script>

<div role="radiogroup" class="container">
  <div class="title">{title}</div>

  {#each options as { value, label }}
    {@const id = `radio-group:${radioGroupId}:${value}`}
    <div class="wrapper">
      <input type="radio" {id} {value} bind:group={selected} />
      <label for={id}>
        {#if typeof label === "string"}
          {label}
        {:else}
          <svelte:component this={label.component} {...label} />
        {/if}
      </label>
    </div>
  {/each}
</div>

<style>
  :root {
    --accent-color: CornflowerBlue;
    --gray: #ccc;
  }

  .wrapper {
    white-space: nowrap;
  }

  .container {
    white-space: nowrap;
    margin-bottom: 1em;
  }

  .title {
    font-weight: bold;
  }

  input[type="radio"]:checked + label {
    font-weight: bold;
  }

  label {
    user-select: none;
  }

  input[type="radio"] {
    display: none;
  }

  input[type="radio"]:checked + label::before {
    content: "🔘 ";
  }
  input[type="radio"] + label::before {
    content: "⚫ ";
  }
</style>
