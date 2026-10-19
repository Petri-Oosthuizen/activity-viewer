<template>
  <CollapsibleSection v-if="hasActivities">
    <template #title>Settings</template>
    <template #description>Cleaning, smoothing, chart view and scale</template>
    <div class="space-y-4 sm:space-y-6">
      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors active:bg-gray-100 sm:hover:bg-gray-50"
          @click="handleResetToDefaults"
          aria-label="Reset all settings to defaults"
        >
          Reset to Defaults
        </button>
      </div>

      <SettingsCleaning />
      <SettingsSmoothing />

      <div class="space-y-3 sm:space-y-4">
        <h4
          class="m-0 text-sm font-semibold text-gray-800 sm:text-base"
          title="Multiplies all plotted values for that activity"
        >
          Scale
        </h4>
        <label
          v-for="activity in activities"
          :key="activity.id"
          class="flex items-center gap-2"
        >
          <span
            class="h-3 w-3 shrink-0 rounded-full"
            :style="{ backgroundColor: activity.color }"
            aria-hidden="true"
          />
          <FileNameDisplay
            :filename="activity.name"
            class="flex-1 text-xs font-medium text-gray-800 sm:text-sm"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            class="focus:border-primary focus:ring-primary/10 w-20 shrink-0 rounded-sm border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900 focus:ring-2 focus:outline-hidden sm:h-7"
            :value="activity.scale"
            :aria-label="`Scale for ${activity.name}`"
            @input="(e) => updateActivityScale(activity.id, e)"
          />
        </label>
      </div>

      <SettingsChartView />
    </div>
  </CollapsibleSection>
</template>

<script setup lang="ts">
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useActivityList } from "~/composables/useActivityList";
import { useSettingsPersistence } from "~/composables/useSettingsPersistence";
import CollapsibleSection from "./CollapsibleSection.vue";
import FileNameDisplay from "./FileNameDisplay.vue";
import SettingsCleaning from "./SettingsCleaning.vue";
import SettingsSmoothing from "./SettingsSmoothing.vue";
import SettingsChartView from "./SettingsChartView.vue";

const settingsStore = useActivitySettingsStore();
const { activities, hasActivities } = useActivityList();
const { resetToDefaults } = useSettingsPersistence();

function updateActivityScale(activityId: string, event: Event) {
  const next = Number.parseFloat((event.target as HTMLInputElement).value);
  settingsStore.setActivityScale(activityId, Number.isFinite(next) ? next : 1);
}

function handleResetToDefaults() {
  if (confirm("Are you sure you want to reset all settings to their default values?")) {
    resetToDefaults();
  }
}
</script>
