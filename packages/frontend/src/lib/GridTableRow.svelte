<script lang="ts">
  export let title: string;

  const common =
    "px-6 py-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800";
  const titleClass = `${common} font-bold`;
  const valueClass = `${common} font-mono text-right truncate`;
</script>

<div class={titleClass}>
  {title}
</div>
<div class={valueClass}>
  <slot />
</div>
