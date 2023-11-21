<script lang="ts">
  export let title: string;
</script>

<div
  class="px-6 py-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 font-bold"
>
  {title}
</div>
<div
  class="px-6 py-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 font-mono overflow-hidden text-right whitespace-nowrap overflow-ellipsis"
>
  <slot />
</div>
