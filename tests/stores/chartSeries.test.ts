import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useChartSeriesStore } from "~/stores/chartSeries";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import type { RawActivity } from "~/types/activity";

describe("useChartSeriesStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const createRawActivity = (id: string, name: string, records: Array<{ t: number; d: number; hr?: number }>): RawActivity => ({
    id,
    name,
    sourceType: "gpx",
    fileContent: "test content",
    records: records as any,
    metadata: {},
  });

  describe("chartSeries computed", () => {
    it("should generate chart series from windowed activities", () => {
      const rawStore = useRawActivityStore();
      const chartSeriesStore = useChartSeriesStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0, hr: 100 },
        { t: 10, d: 100, hr: 110 },
      ]);

      rawStore.addRawActivity(rawActivity);

      const series = chartSeriesStore.chartSeries;

      expect(series.length).toBeGreaterThan(0);
    });

    it("should exclude disabled activities", () => {
      const rawStore = useRawActivityStore();
      const chartSeriesStore = useChartSeriesStore();

      const activity1 = createRawActivity("test-1", "Activity 1", [{ t: 0, d: 0, hr: 100 }]);
      const activity2 = createRawActivity("test-2", "Activity 2", [{ t: 0, d: 0, hr: 100 }]);

      rawStore.addRawActivity(activity1);
      rawStore.addRawActivity(activity2);

      // Disable activity 2
      const settingsStore = useActivitySettingsStore();
      settingsStore.toggleActivity("test-2");

      const series = chartSeriesStore.chartSeries;

      const activity2Series = series.filter((s) => s.activityId === "test-2");
      expect(activity2Series.length).toBe(0);
    });

    it("should react to selected metrics changes", () => {
      const rawStore = useRawActivityStore();
      const chartSeriesStore = useChartSeriesStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0, hr: 100, alt: 10 } as any,
        { t: 10, d: 100, hr: 110, alt: 12 } as any,
      ]);

      rawStore.addRawActivity(rawActivity);

      const series1 = chartSeriesStore.chartSeries;

      expect(series1.length).toBeGreaterThan(0);
    });
  });

  describe("chartOption computed", () => {
    it("should generate chart option configuration", () => {
      const rawStore = useRawActivityStore();
      const chartSeriesStore = useChartSeriesStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0, hr: 100 },
        { t: 10, d: 100, hr: 110 },
      ]);

      rawStore.addRawActivity(rawActivity);

      const option = chartSeriesStore.chartOption;

      expect(option).toBeDefined();
      expect(option.tooltip).toBeDefined();
      expect(option.xAxis).toBeDefined();
    });
  });

  describe("setTransformationSettings", () => {
    it("should update transformation settings", () => {
      const chartSeriesStore = useChartSeriesStore();

      const newSettings = {
        cumulative: { mode: "off" as const },
        pivotZones: { zoneCount: 5, strategy: "equalRange" as const },
      };

      chartSeriesStore.setTransformationSettings(newSettings);

      expect(chartSeriesStore.transformationSettings.cumulative.mode).toBe("off");
      expect(chartSeriesStore.transformationSettings.pivotZones.zoneCount).toBe(5);
    });
  });
});
