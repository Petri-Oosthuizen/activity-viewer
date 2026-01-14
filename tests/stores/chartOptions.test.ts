import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useProcessedActivityStore } from "~/stores/processedActivity";
import { useRawActivityStore } from "~/stores/rawActivity";
import type { RawActivity } from "~/types/activity";

describe("useChartOptionsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const createRawActivity = (id: string, name: string, records: Array<{ t: number; d: number; hr?: number; alt?: number }>): RawActivity => ({
    id,
    name,
    sourceType: "gpx",
    fileContent: "test content",
    records: records as any,
    metadata: {},
  });

  describe("selectedMetrics", () => {
    it("should have default metric selection", () => {
      const store = useChartOptionsStore();

      expect(store.selectedMetrics).toEqual(["alt"]);
    });

    it("should set selected metrics", () => {
      const store = useChartOptionsStore();

      store.setSelectedMetrics(["hr", "pwr"]);

      expect(store.selectedMetrics).toEqual(["hr", "pwr"]);
    });

    it("should toggle metric in single mode", () => {
      const store = useChartOptionsStore();

      store.setMetricSelectionMode("single");
      store.toggleMetric("hr");

      expect(store.selectedMetrics).toEqual(["hr"]);

      store.toggleMetric("pwr");

      expect(store.selectedMetrics).toEqual(["pwr"]);
    });

    it("should toggle metric in multi mode", () => {
      const store = useChartOptionsStore();

      store.setMetricSelectionMode("multi");
      store.setSelectedMetrics(["hr"]);

      store.toggleMetric("pwr");

      expect(store.selectedMetrics).toContain("hr");
      expect(store.selectedMetrics).toContain("pwr");

      store.toggleMetric("hr");

      expect(store.selectedMetrics).not.toContain("hr");
      expect(store.selectedMetrics).toContain("pwr");
    });

    it("should not remove last metric in multi mode", () => {
      const store = useChartOptionsStore();

      store.setMetricSelectionMode("multi");
      store.setSelectedMetrics(["hr"]);

      store.toggleMetric("hr");

      expect(store.selectedMetrics).toContain("hr");
      expect(store.selectedMetrics.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("metricSelectionMode", () => {
    it("should default to single mode", () => {
      const store = useChartOptionsStore();

      expect(store.metricSelectionMode).toBe("single");
    });

    it("should set metric selection mode", () => {
      const store = useChartOptionsStore();

      store.setMetricSelectionMode("multi");

      expect(store.metricSelectionMode).toBe("multi");
    });

    it("should reduce to single metric when switching to single mode", () => {
      const store = useChartOptionsStore();

      store.setMetricSelectionMode("multi");
      store.setSelectedMetrics(["hr", "pwr", "alt"]);

      store.setMetricSelectionMode("single");

      expect(store.selectedMetrics).toHaveLength(1);
      expect(store.selectedMetrics[0]).toBe("hr");
    });
  });

  describe("xAxisType", () => {
    it("should have default xAxisType", () => {
      const store = useChartOptionsStore();

      expect(store.xAxisType).toBe("distance");
    });

    it("should set xAxisType", () => {
      const store = useChartOptionsStore();

      store.setXAxisType("time");

      expect(store.xAxisType).toBe("time");
    });
  });

  describe("viewMode", () => {
    it("should have default viewMode", () => {
      const store = useChartOptionsStore();

      expect(store.viewMode).toBe("timeseries");
    });

    it("should set viewMode", () => {
      const store = useChartOptionsStore();

      store.setViewMode("pivotZones");

      expect(store.viewMode).toBe("pivotZones");
    });
  });

  describe("availableMetrics computed", () => {
    it("should compute available metrics from processed activities", () => {
      const rawStore = useRawActivityStore();
      const chartOptionsStore = useChartOptionsStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0, hr: 100, alt: 10 },
        { t: 10, d: 100, hr: 110, alt: 12 },
      ]);

      rawStore.addRawActivity(rawActivity);

      const available = chartOptionsStore.availableMetrics;

      expect(available).toContain("hr");
      expect(available).toContain("alt");
    });

    it("should update when activities change", () => {
      const rawStore = useRawActivityStore();
      const chartOptionsStore = useChartOptionsStore();

      const activity1 = createRawActivity("test-1", "Activity 1", [
        { t: 0, d: 0, hr: 100 },
      ]);

      rawStore.addRawActivity(activity1);

      const available1 = chartOptionsStore.availableMetrics;
      expect(available1).toContain("hr");

      const activity2 = createRawActivity("test-2", "Activity 2", [
        { t: 0, d: 0, pwr: 200 },
      ]);

      rawStore.addRawActivity(activity2);

      const available2 = chartOptionsStore.availableMetrics;
      expect(available2).toContain("hr");
      expect(available2).toContain("pwr");
    });
  });

  describe("metric selection validation", () => {
    it("should auto-correct when selected metric becomes unavailable", () => {
      const rawStore = useRawActivityStore();
      const chartOptionsStore = useChartOptionsStore();

      const activity1 = createRawActivity("test-1", "Activity 1", [
        { t: 0, d: 0, hr: 100, alt: 10 },
      ]);

      rawStore.addRawActivity(activity1);
      chartOptionsStore.setSelectedMetrics(["hr"]);

      // Remove activity and add one without hr
      rawStore.removeRawActivity("test-1");
      const activity2 = createRawActivity("test-2", "Activity 2", [
        { t: 0, d: 0, alt: 10 },
      ]);
      rawStore.addRawActivity(activity2);

      // Should auto-correct to available metric
      const selected = chartOptionsStore.selectedMetrics;
      expect(selected.length).toBeGreaterThan(0);
      expect(selected[0]).not.toBe("hr");
    });

    it("should select first available metric when current selection is invalid", () => {
      const rawStore = useRawActivityStore();
      const chartOptionsStore = useChartOptionsStore();

      const activity = createRawActivity("test-1", "Activity 1", [
        { t: 0, d: 0, alt: 10 },
      ]);

      rawStore.addRawActivity(activity);
      chartOptionsStore.setSelectedMetrics(["pwr"]); // Not available

      // Should auto-correct
      const selected = chartOptionsStore.selectedMetrics;
      expect(selected.length).toBeGreaterThan(0);
      expect(selected[0]).toBe("alt"); // First available
    });
  });
});
