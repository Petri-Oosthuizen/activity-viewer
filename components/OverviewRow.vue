<template>
  <tr v-if="variant === 'group'" class="bg-gray-50">
    <td
      colspan="2"
      class="sticky left-0 z-10 w-20 border-b border-gray-200 bg-gray-50 px-2 py-2 font-semibold sm:w-24 sm:px-3"
    >
      <span :title="description">{{ label }}</span>
    </td>
    <td
      v-for="a in activities.slice(1)"
      :key="a.id"
      class="border-b border-gray-200 bg-gray-50"
    ></td>
  </tr>
  <tr v-else class="bg-white">
    <td
      class="sticky left-0 z-10 w-20 border-b border-gray-100 bg-white px-2 py-2.5 font-medium sm:w-24 sm:px-3 md:w-32 lg:w-36"
    >
      <span :class="{ 'text-[10px] text-gray-500 sm:text-xs': variant === 'sub' }" :title="description">
        {{ label }}
      </span>
    </td>
    <td
      v-for="(a, i) in activities"
      :key="a.id"
      class="border-b border-gray-100 px-2 py-2.5 text-right sm:px-3"
    >
      <div :class="{ 'text-gray-400': cells[i]?.muted }" :title="cells[i]?.title">
        {{ cells[i]?.text ?? "—" }}
      </div>
      <div
        v-if="deltas"
        class="mt-0.5 text-[10px] text-gray-400 sm:text-xs"
        :title="deltas[i] === '—' ? 'Same as baseline' : undefined"
      >
        {{ deltas[i] }}
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { OverviewCell, OverviewRowVariant } from "~/composables/useOverviewRows";

interface Props {
  label: string;
  description?: string;
  variant?: OverviewRowVariant;
  activities: readonly { id: string }[];
  cells?: readonly OverviewCell[];
  deltas?: readonly string[];
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  variant: "row",
  cells: () => [],
  deltas: undefined,
});
</script>
