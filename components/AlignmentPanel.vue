<template>
  <div class="rounded-lg bg-white p-4 shadow-xs sm:p-6">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
      <h3 class="m-0 text-base font-semibold text-gray-800 sm:text-lg">Alignment</h3>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-1.5 sm:hover:bg-gray-50"
          :disabled="!canAlignByGps"
          @click="alignByGps"
        >
          Align by GPS
        </button>
        <button
          type="button"
          class="rounded-sm border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors active:bg-gray-100 sm:py-1.5 sm:hover:bg-gray-50"
          @click="resetOffsets"
        >
          Reset offsets
        </button>
      </div>
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
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useActivityList } from "~/composables/useActivityList";
import { useActivityAlignment } from "~/composables/useActivityAlignment";
import FileNameDisplay from "./FileNameDisplay.vue";
import TimeOffsetControl from "./TimeOffsetControl.vue";

const settingsStore = useActivitySettingsStore();
const { activityOffsets } = storeToRefs(settingsStore);
const { activities } = useActivityList();
const { canAlignByGps, statusText, alignByGps, resetOffsets } = useActivityAlignment();
</script>
