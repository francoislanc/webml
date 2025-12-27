<script lang="ts">
  let { model } = $props();
</script>

<div>
  <div class="flex flex-col items-center">
    {#if model && model.isLoading}
      <span class="loading loading-dots loading-lg"></span>{model.currentStep}
    {/if}
  </div>
</div>
