/**
 * Composable for localStorage persistence of settings
 * Handles saving and loading settings to/from browser localStorage
 */

import { watch, onMounted, getCurrentInstance, ref, computed } from "vue";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useChartSeriesStore } from "~/stores/chartSeries";
import { useUIStore } from "~/stores/ui";
import { DEFAULT_SETTINGS, type AppSettings, type StoredAppSettings } from "~/utils/default-settings";

const STORAGE_KEY_SETTINGS = "activity-viewer:settings";
const sharedIsInitialized = ref(false);
const sharedSaveError = ref<string | null>(null);
let watchedSettingsStores = new WeakSet<object>();

export function resetSettingsPersistenceStateForTests() {
  sharedIsInitialized.value = false;
  sharedSaveError.value = null;
  watchedSettingsStores = new WeakSet<object>();
}

export function useSettingsPersistence() {
  const settingsStore = useActivitySettingsStore();
  const chartOptionsStore = useChartOptionsStore();
  const chartSeriesStore = useChartSeriesStore();
  const uiStore = useUIStore();

  const exportAll = (): AppSettings => ({
    activitySettings: settingsStore.exportSettings(),
    chartOptions: chartOptionsStore.exportSettings(),
    chartSeries: chartSeriesStore.exportSettings(),
    ui: uiStore.exportSettings(),
  });

  const importAll = (settings: StoredAppSettings) => {
    if (settings.activitySettings) settingsStore.importSettings(settings.activitySettings);
    if (settings.chartOptions) chartOptionsStore.importSettings(settings.chartOptions);
    if (settings.chartSeries) chartSeriesStore.importSettings(settings.chartSeries);
    if (settings.ui) uiStore.importSettings(settings.ui);
  };

  const saveSettings = () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(exportAll()));
      sharedSaveError.value = null;
    } catch (error) {
      console.error("Failed to save settings to localStorage:", error);
      sharedSaveError.value = "Could not save settings locally in this browser.";
    }
  };

  const loadSettings = () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (!stored) return;
      const parsed: StoredAppSettings = JSON.parse(stored);
      importAll(parsed);
    } catch (error) {
      console.error("Failed to load settings from localStorage:", error);
      sharedSaveError.value = "Could not load saved settings; defaults are being used.";
    }
  };

  const clearFileSpecificSettings = () => {
    settingsStore.clearFileSpecificSettings();
  };

  const resetToDefaults = () => {
    importAll(DEFAULT_SETTINGS);
    settingsStore.clearFileSpecificSettings();
    saveSettings();
  };

  const setupPersistenceWatch = () => {
    if (watchedSettingsStores.has(settingsStore)) return;
    watchedSettingsStores.add(settingsStore);

    watch(exportAll, saveSettings, { deep: true });
  };

  if (getCurrentInstance()) {
    onMounted(() => {
      if (!sharedIsInitialized.value) {
        loadSettings();
        sharedIsInitialized.value = true;
      }
      setupPersistenceWatch();
    });
  }

  return {
    isInitialized: computed(() => sharedIsInitialized.value),
    saveError: computed(() => sharedSaveError.value),
    saveSettings,
    loadSettings,
    clearFileSpecificSettings,
    resetToDefaults,
  };
}
