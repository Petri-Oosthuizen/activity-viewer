<template>
  <div class="rounded-lg bg-white p-4 shadow-xs sm:p-6">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
      <h3 class="m-0 text-base font-semibold text-gray-800 sm:text-lg">Alignment</h3>
      <SegmentedControl :model-value="alignmentMode" :options="modeOptions" @update:model-value="setMode" />
    </div>

    <p v-if="statusText" class="mt-0 mb-3 text-xs text-amber-700 sm:text-sm">
      {{ statusText }}
    </p>

    <ul class="m-0 flex list-none flex-col gap-2 p-0 sm:gap-3">
      <li
        v-for="activity in activities"
        :key="activity.id"
        class="flex flex-col gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="h-3 w-3 shrink-0 rounded-full"
            :style="{ backgroundColor: activity.color }"
            aria-hidden="true"
          />
          <FileNameDisplay
            :filename="activity.name"
            class="text-xs font-medium text-gray-800 sm:text-sm"
          />
        </div>
        <TimeOffsetControl
          :offset="activityOffsets.get(activity.id) ?? 0"
          @update:offset="(offset) => settingsStore.setActivityOffset(activity.id, offset)"
        />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import type { AlignmentMode } from "~/stores/activitySettings";
import { useActivityList } from "~/composables/useActivityList";
import { useActivityAlignment } from "~/composables/useActivityAlignment";
import FileNameDisplay from "./FileNameDisplay.vue";
import TimeOffsetControl from "./TimeOffsetControl.vue";
import SegmentedControl, { type SegmentedOption } from "./SegmentedControl.vue";

const settingsStore = useActivitySettingsStore();
const { activityOffsets } = storeToRefs(settingsStore);
const { activities } = useActivityList();
const { alignmentMode, canAlignByGps, statusText, setMode } = useActivityAlignment();

const modeOptions = computed<SegmentedOption<AlignmentMode>[]>(() => [
  { value: "none", label: "None", title: "Clear all offsets" },
  { value: "startTime", label: "Start time", title: "Start every activity at the same clock time" },
  { value: "gps", label: "GPS", title: "Match the routes by GPS track", disabled: !canAlignByGps.value },
]);
</script>
