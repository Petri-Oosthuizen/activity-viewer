<template>
  <div class="flex min-h-[400px] items-center justify-center">
    <div class="flex flex-col items-center gap-4">
      <span
        class="border-t-primary h-8 w-8 animate-spin rounded-full border-2 border-gray-200"
      ></span>
      <p class="text-sm text-gray-600">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>
