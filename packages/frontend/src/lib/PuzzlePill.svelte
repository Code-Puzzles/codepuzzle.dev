<script lang="ts">
  export let text = "";
  export let pillText = "";
  export let pillAppearance: "subtle" | "complete" = "subtle";
</script>

<div class={pillAppearance}>
  <span class="pill">
    {pillText}
  </span>
  {text}
</div>

<style>
  div {
    display: inline-block;

    margin-top: 0.5ex;
    margin-bottom: 0.5ex;
  }

  .pill {
    display: inline-block;
    font-family: monospace;
    border-radius: 1ex;
    padding: 4px;
  }

  .complete .pill {
    background-color: green;
  }

  .subtle .pill {
    opacity: 0.5;
    border: 1px solid grey;
  }
</style>
