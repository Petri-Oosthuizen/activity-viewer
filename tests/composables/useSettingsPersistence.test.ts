import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { useSettingsPersistence } from "~/composables/useSettingsPersistence";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useChartSeriesStore } from "~/stores/chartSeries";
import { DEFAULT_CHART_TRANSFORM_SETTINGS } from "~/utils/chart-settings";
import { DEFAULT_GPS_DISTANCE_OPTIONS } from "~/utils/gps-distance";

describe("useSettingsPersistence", () => {
  let localStorageMock: Record<string, string>;
  let localStorageGetItemSpy: ReturnType<typeof vi.spyOn>;
  let localStorageSetItemSpy: ReturnType<typeof vi.spyOn>;
  let localStorageRemoveItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorageMock = {};

    localStorageGetItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key: string) => {
      return localStorageMock[key] || null;
    });

    localStorageSetItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    localStorageRemoveItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key: string) => {
      delete localStorageMock[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should load settings from localStorage on mount", async () => {
    const storedSettings = {
      activitySettings: {
        outlierSettings: { mode: "drop" as const, maxPercentChange: 150 },
        gpsDistanceOptions: { ...DEFAULT_GPS_DISTANCE_OPTIONS, minMoveMeters: 5 },
        gpsSmoothing: { enabled: true, windowPoints: 10 },
        deltaSettings: { enabled: true, mode: "delta-only" as const, baseActivityId: "base-1", compareActivityId: "compare-1" },
      },
      chartOptions: {
        selectedMetrics: ["hr", "pwr"] as const,
        xAxisType: "time" as const,
        viewMode: "pivotZones" as const,
        metricSelectionMode: "multi" as const,
      },
      chartSeries: {
        transformationSettings: {
          cumulative: { mode: "sum" as const },
          pivotZones: { zoneCount: 7, strategy: "quantiles" as const },
        },
      },
    };

    localStorageMock["activity-viewer:settings"] = JSON.stringify(storedSettings);

    const TestComponent = defineComponent({
      setup() {
        useSettingsPersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);
    await nextTick();

    const settingsStore = useActivitySettingsStore();
    const chartOptionsStore = useChartOptionsStore();
    const chartSeriesStore = useChartSeriesStore();

    expect(settingsStore.outlierSettings.mode).toBe("drop");
    expect(settingsStore.outlierSettings.maxPercentChange).toBe(150);
    expect(settingsStore.gpsDistanceOptions.minMoveMeters).toBe(5);
    expect(settingsStore.gpsSmoothing.enabled).toBe(true);
    expect(settingsStore.deltaSettings.enabled).toBe(true);

    expect(chartOptionsStore.selectedMetrics).toEqual(["hr", "pwr"]);
    expect(chartOptionsStore.xAxisType).toBe("time");
    expect(chartOptionsStore.viewMode).toBe("pivotZones");
    expect(chartOptionsStore.metricSelectionMode).toBe("multi");

    expect(chartSeriesStore.transformationSettings.cumulative.mode).toBe("sum");
    expect(chartSeriesStore.transformationSettings.pivotZones.zoneCount).toBe(7);
  });

  it("should save settings to localStorage when settings change", async () => {
    const TestComponent = defineComponent({
      setup() {
        const { saveSettings } = useSettingsPersistence();
        return { saveSettings };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    const settingsStore = useActivitySettingsStore();
    const chartOptionsStore = useChartOptionsStore();
    const chartSeriesStore = useChartSeriesStore();

    settingsStore.setOutlierSettings({ mode: "drop", maxPercentChange: 150 });
    chartOptionsStore.setSelectedMetrics(["hr"]);
    chartSeriesStore.setTransformationSettings({
      cumulative: { mode: "off" },
      pivotZones: { zoneCount: 5, strategy: "equalRange" },
    });

    await nextTick();

    wrapper.vm.saveSettings();
    await nextTick();

    const saved = JSON.parse(localStorageMock["activity-viewer:settings"]);
    expect(saved.activitySettings.outlierSettings.mode).toBe("drop");
    expect(saved.activitySettings.outlierSettings.maxPercentChange).toBe(150);
    expect(saved.chartOptions.selectedMetrics).toEqual(["hr"]);
    expect(saved.chartSeries.transformationSettings.cumulative.mode).toBe("off");
  });

  it("should clear file-specific settings", async () => {
    const settingsStore = useActivitySettingsStore();
    settingsStore.setActivityOffset("activity-1", 10);
    settingsStore.setActivityScale("activity-1", 1.5);
    settingsStore.toggleActivity("activity-1");

    const TestComponent = defineComponent({
      setup() {
        const { clearFileSpecificSettings } = useSettingsPersistence();
        return { clearFileSpecificSettings };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(settingsStore.activityOffsets.has("activity-1")).toBe(true);
    expect(settingsStore.activityScales.has("activity-1")).toBe(true);
    expect(settingsStore.disabledActivities.has("activity-1")).toBe(true);

    wrapper.vm.clearFileSpecificSettings();

    expect(settingsStore.activityOffsets.has("activity-1")).toBe(false);
    expect(settingsStore.activityScales.has("activity-1")).toBe(false);
    expect(settingsStore.disabledActivities.has("activity-1")).toBe(false);
  });

  it("should handle invalid localStorage data gracefully", async () => {
    localStorageMock["activity-viewer:settings"] = "invalid json";

    const TestComponent = defineComponent({
      setup() {
        useSettingsPersistence();
        return {};
      },
      template: "<div></div>",
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mount(TestComponent);
    await nextTick();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("should handle missing localStorage data gracefully", async () => {
    const TestComponent = defineComponent({
      setup() {
        useSettingsPersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);
    await nextTick();

    const settingsStore = useActivitySettingsStore();
    const chartOptionsStore = useChartOptionsStore();

    expect(settingsStore.outlierSettings.mode).toBe(DEFAULT_CHART_TRANSFORM_SETTINGS.outliers.mode);
    expect(chartOptionsStore.selectedMetrics).toBeDefined();
  });
});
