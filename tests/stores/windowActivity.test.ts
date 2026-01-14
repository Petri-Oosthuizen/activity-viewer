import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useWindowActivityStore } from "~/stores/windowActivity";
import { useTransformedActivityStore } from "~/stores/transformedActivity";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useProcessedActivityStore } from "~/stores/processedActivity";
import { useRawActivityStore } from "~/stores/rawActivity";
import type { RawActivity } from "~/types/activity";

describe("useWindowActivityStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const createRawActivity = (id: string, name: string, records: Array<{ t: number; d: number }>): RawActivity => ({
    id,
    name,
    sourceType: "gpx",
    fileContent: "test content",
    records: records as any,
    metadata: {},
  });

  describe("windowedActivities computed", () => {
    it("should return all activities when window is full (no trimming)", () => {
      const rawStore = useRawActivityStore();
      const windowStore = useWindowActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 20, d: 200 },
      ]);

      rawStore.addRawActivity(rawActivity);

      const windowed = windowStore.windowedActivities;

      expect(windowed).toHaveLength(1);
      expect(windowed[0]?.records).toHaveLength(3);
    });

    it("should trim records when window is active", () => {
      const rawStore = useRawActivityStore();
      const chartOptionsStore = useChartOptionsStore();
      const windowStore = useWindowActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 20, d: 200 },
        { t: 30, d: 300 },
        { t: 40, d: 400 },
      ]);

      rawStore.addRawActivity(rawActivity);
      chartOptionsStore.setXAxisType("distance");
      windowStore.setChartWindow({
        xStartPercent: 20,
        xEndPercent: 80,
        yStartPercent: 0,
        yEndPercent: 100,
      });

      const windowed = windowStore.windowedActivities;

      expect(windowed).toHaveLength(1);
      // Should have fewer records after trimming
      expect(windowed[0]?.records.length).toBeLessThanOrEqual(5);
      // Records should be within the window range
      const distances = windowed[0]?.records.map((r) => r.d) || [];
      distances.forEach((d) => {
        expect(d).toBeGreaterThanOrEqual(80); // 20% of 400
        expect(d).toBeLessThanOrEqual(320); // 80% of 400
      });
    });

    it("should use xAxisType from chartOptionsStore", () => {
      const rawStore = useRawActivityStore();
      const chartOptionsStore = useChartOptionsStore();
      const windowStore = useWindowActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 20, d: 200 },
        { t: 30, d: 300 },
      ]);

      rawStore.addRawActivity(rawActivity);
      chartOptionsStore.setXAxisType("time");
      windowStore.setChartWindow({
        xStartPercent: 25,
        xEndPercent: 75,
        yStartPercent: 0,
        yEndPercent: 100,
      });

      const windowed = windowStore.windowedActivities;

      // Should trim based on time axis
      expect(windowed[0]?.records.length).toBeLessThanOrEqual(4);
      const times = windowed[0]?.records.map((r) => r.t) || [];
      times.forEach((t) => {
        expect(t).toBeGreaterThanOrEqual(7.5); // 25% of 30
        expect(t).toBeLessThanOrEqual(22.5); // 75% of 30
      });
    });

    it("should handle multiple activities", () => {
      const rawStore = useRawActivityStore();
      const windowStore = useWindowActivityStore();

      const activity1 = createRawActivity("test-1", "Activity 1", [
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 20, d: 200 },
      ]);
      const activity2 = createRawActivity("test-2", "Activity 2", [
        { t: 0, d: 0 },
        { t: 10, d: 150 },
        { t: 20, d: 300 },
      ]);

      rawStore.addRawActivity(activity1);
      rawStore.addRawActivity(activity2);

      const windowed = windowStore.windowedActivities;

      expect(windowed).toHaveLength(2);
    });

    it("should react to chartWindow changes", () => {
      const rawStore = useRawActivityStore();
      const windowStore = useWindowActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0 },
        { t: 10, d: 100 },
        { t: 20, d: 200 },
        { t: 30, d: 300 },
      ]);

      rawStore.addRawActivity(rawActivity);

      const windowed1 = windowStore.windowedActivities;
      expect(windowed1[0]?.records.length).toBe(4);

      windowStore.setChartWindow({
        xStartPercent: 25,
        xEndPercent: 75,
        yStartPercent: 0,
        yEndPercent: 100,
      });

      const windowed2 = windowStore.windowedActivities;
      expect(windowed2[0]?.records.length).toBeLessThanOrEqual(4);
    });

    it("should handle empty transformed activities", () => {
      const windowStore = useWindowActivityStore();

      const windowed = windowStore.windowedActivities;

      expect(windowed).toHaveLength(0);
    });
  });

  describe("setChartWindow", () => {
    it("should update chartWindow", () => {
      const windowStore = useWindowActivityStore();

      const newWindow = {
        xStartPercent: 10,
        xEndPercent: 90,
        yStartPercent: 20,
        yEndPercent: 80,
      };

      windowStore.setChartWindow(newWindow);

      expect(windowStore.chartWindow).toEqual(newWindow);
    });
  });
});
