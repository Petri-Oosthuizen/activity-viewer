<template>
  <span :class="containerClass" :title="filename">
    <template v-if="nameParts.ext">
      <span class="min-w-0 shrink overflow-hidden text-ellipsis whitespace-nowrap">
        {{ nameParts.base }}
      </span>
      <span class="shrink-0">.{{ nameParts.ext }}</span>
    </template>
    <template v-else>
      <span class="min-w-0 shrink overflow-hidden text-ellipsis whitespace-nowrap">
        {{ nameParts.base }}
      </span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  filename: string;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  class: "",
});

function splitFilename(filename: string): { base: string; ext: string } {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return { base: filename, ext: "" };
  }
  return {
    base: filename.slice(0, lastDotIndex),
    ext: filename.slice(lastDotIndex + 1),
  };
}

const nameParts = computed(() => splitFilename(props.filename));

const containerClass = computed(() => {
  const base = "inline-flex min-w-0 items-center";
  return props.class ? `${base} ${props.class}` : base;
});
</script>