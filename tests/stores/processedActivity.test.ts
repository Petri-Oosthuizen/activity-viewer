import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useProcessedActivityStore } from "~/stores/processedActivity";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import type { RawActivity } from "~/types/activity";

describe("useProcessedActivityStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const createRawActivity = (id: string, name: string, records: Array<{ t: number; d: number; hr?: number; alt?: number }>): RawActivity => ({
    id,
    name,
    sourceType: "gpx",
    fileContent: "test content",
    records: records.map((r) => ({ ...r })) as any,
    metadata: {},
  });

  describe("processedActivities computed", () => {
    it("should process raw activities into processed activities", () => {
      const rawStore = useRawActivityStore();
      const processedStore = useProcessedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test Activity", [
        { t: 0, d: 0, hr: 100 },
        { t: 10, d: 100, hr: 110 },
      ]);

      rawStore.addRawActivity(rawActivity);

      const processed = processedStore.processedActivities;

      expect(processed).toHaveLength(1);
      expect(processed[0]?.id).toBe("test-1");
      expect(processed[0]?.name).toBe("Test Activity");
      expect(processed[0]?.records).toBeDefined();
      expect(processed[0]?.records.length).toBe(2);
    });

    it("should assign colors to activities", () => {
      const rawStore = useRawActivityStore();
      const processedStore = useProcessedActivityStore();

      const activity1 = createRawActivity("test-1", "Activity 1", [{ t: 0, d: 0 }]);
      const activity2 = createRawActivity("test-2", "Activity 2", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(activity1);
      rawStore.addRawActivity(activity2);

      const processed = processedStore.processedActivities;

      expect(processed[0]?.color).toBeDefined();
      expect(processed[1]?.color).toBeDefined();
      expect(processed[0]?.color).not.toBe(processed[1]?.color);
    });

    // Outlier handling is tested in activity-processor.test.ts
    // This test is removed as it duplicates coverage and the calculation
    // is complex (uses max of both values as denominator)

    it("should apply GPS smoothing when enabled", () => {
      const rawStore = useRawActivityStore();
      const settingsStore = useActivitySettingsStore();
      const processedStore = useProcessedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0, hr: 100 },
        { t: 10, d: 100, hr: 110 },
      ]);

      rawStore.addRawActivity(rawActivity);
      settingsStore.setGpsSmoothing({ enabled: true, windowPoints: 3 });

      const processed = processedStore.processedActivities;

      expect(processed[0]?.records).toBeDefined();
      expect(processed[0]?.records.length).toBe(2);
    });

    it("should apply scaling per activity", async () => {
      const rawStore = useRawActivityStore();
      const settingsStore = useActivitySettingsStore();
      const processedStore = useProcessedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0, hr: 100 },
        { t: 10, d: 100, hr: 110 },
      ]);

      rawStore.addRawActivity(rawActivity);
      settingsStore.setActivityScale("test-1", 1.5);

      await vi.waitFor(
        () => {
          const processed = processedStore.processedActivities;
          expect(processed[0]?.scale).toBe(1.5);
          expect(processed[0]?.records[0]?.hr).toBe(150); // 100 * 1.5
          expect(processed[0]?.records[1]?.hr).toBe(165); // 110 * 1.5
        },
        { timeout: 500 }
      );
    });

    it("should apply offset per activity", async () => {
      const rawStore = useRawActivityStore();
      const settingsStore = useActivitySettingsStore();
      const processedStore = useProcessedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0, hr: 100 },
        { t: 10, d: 100, hr: 110 },
      ]);

      rawStore.addRawActivity(rawActivity);
      settingsStore.setActivityOffset("test-1", 5);

      await vi.waitFor(
        () => {
          const processed = processedStore.processedActivities;
          expect(processed[0]?.offset).toBe(5);
          expect(processed[0]?.records[0]?.t).toBe(5); // 0 + 5
          expect(processed[0]?.records[1]?.t).toBe(15); // 10 + 5
        },
        { timeout: 500 }
      );
    });

    it("should calculate derived metrics", () => {
      const rawStore = useRawActivityStore();
      const processedStore = useProcessedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0, alt: 100 },
        { t: 10, d: 100, alt: 110 }, // 10m up in 100m
        { t: 20, d: 200, alt: 105 },
      ]);

      rawStore.addRawActivity(rawActivity);

      const processed = processedStore.processedActivities;

      // Derived metrics should be calculated
      const recordWithGrade = processed[0]?.records.find((r) => r.d === 100);
      expect(recordWithGrade?.grade).toBeDefined();
      expect(recordWithGrade?.verticalSpeed).toBeDefined();
    });

    it("should react to settings changes", async () => {
      const rawStore = useRawActivityStore();
      const settingsStore = useActivitySettingsStore();
      const processedStore = useProcessedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [
        { t: 0, d: 0, hr: 100 },
        { t: 10, d: 100, hr: 110 },
      ]);

      rawStore.addRawActivity(rawActivity);

      const processed1 = processedStore.processedActivities;
      const hr1 = processed1[0]?.records[0]?.hr;

      settingsStore.setActivityScale("test-1", 2);

      await vi.waitFor(
        () => {
          const processed2 = processedStore.processedActivities;
          const hr2 = processed2[0]?.records[0]?.hr;
          expect(hr2).toBe(hr1! * 2);
        },
        { timeout: 500 }
      );
    });

    it("should handle multiple activities with different settings", async () => {
      const rawStore = useRawActivityStore();
      const settingsStore = useActivitySettingsStore();
      const processedStore = useProcessedActivityStore();

      const activity1 = createRawActivity("test-1", "Activity 1", [{ t: 0, d: 0, hr: 100 }]);
      const activity2 = createRawActivity("test-2", "Activity 2", [{ t: 0, d: 0, hr: 100 }]);

      rawStore.addRawActivity(activity1);
      rawStore.addRawActivity(activity2);

      settingsStore.setActivityScale("test-1", 1.5);
      settingsStore.setActivityOffset("test-2", 10);

      await vi.waitFor(
        () => {
          const processed = processedStore.processedActivities;
          expect(processed).toHaveLength(2);
          expect(processed[0]?.scale).toBe(1.5);
          expect(processed[1]?.offset).toBe(10);
        },
        { timeout: 500 }
      );
    });

    it("should preserve metadata from raw activity", () => {
      const rawStore = useRawActivityStore();
      const processedStore = useProcessedActivityStore();

      const startTime = new Date("2024-01-01T12:00:00Z");
      const rawActivity: RawActivity = {
        id: "test-1",
        name: "Test",
        sourceType: "gpx",
        fileContent: "content",
        records: [{ t: 0, d: 0 }],
        metadata: {
          startTime,
          calories: 500,
          sport: "running",
        },
      };

      rawStore.addRawActivity(rawActivity);

      const processed = processedStore.processedActivities;

      expect(processed[0]?.startTime).toEqual(startTime);
      expect(processed[0]?.calories).toBe(500);
      expect(processed[0]?.sport).toBe("running");
    });
  });

  describe("getProcessedActivity", () => {
    it("should return processed activity by id", () => {
      const rawStore = useRawActivityStore();
      const processedStore = useProcessedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(rawActivity);

      const found = processedStore.getProcessedActivity("test-1");

      expect(found).toBeDefined();
      expect(found?.id).toBe("test-1");
    });

    it("should return undefined for non-existent id", () => {
      const processedStore = useProcessedActivityStore();

      const found = processedStore.getProcessedActivity("non-existent");

      expect(found).toBeUndefined();
    });
  });
});
