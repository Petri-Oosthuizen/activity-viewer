import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTransformedActivityStore } from "~/stores/transformedActivity";
import { useProcessedActivityStore } from "~/stores/processedActivity";
import { useRawActivityStore } from "~/stores/rawActivity";
import type { RawActivity } from "~/types/activity";

describe("useTransformedActivityStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const createRawActivity = (id: string, name: string): RawActivity => ({
    id,
    name,
    sourceType: "gpx",
    fileContent: "test content",
    records: [{ t: 0, d: 0, hr: 100 }],
    metadata: {},
  });

  describe("transformedActivities computed", () => {
    it("should mirror processedActivities (currently pass-through)", () => {
      const rawStore = useRawActivityStore();
      const transformedStore = useTransformedActivityStore();
      const processedStore = useProcessedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test Activity");

      rawStore.addRawActivity(rawActivity);

      const processed = processedStore.processedActivities;
      const transformed = transformedStore.transformedActivities;

      expect(transformed).toHaveLength(1);
      expect(transformed[0]?.id).toBe(processed[0]?.id);
      expect(transformed[0]?.name).toBe(processed[0]?.name);
    });

    it("should react to processedActivities changes", () => {
      const rawStore = useRawActivityStore();
      const transformedStore = useTransformedActivityStore();

      const activity1 = createRawActivity("test-1", "Activity 1");
      const activity2 = createRawActivity("test-2", "Activity 2");

      rawStore.addRawActivity(activity1);

      const transformed1 = transformedStore.transformedActivities;
      expect(transformed1).toHaveLength(1);

      rawStore.addRawActivity(activity2);

      const transformed2 = transformedStore.transformedActivities;
      expect(transformed2).toHaveLength(2);
    });

    it("should preserve all activity properties", () => {
      const rawStore = useRawActivityStore();
      const transformedStore = useTransformedActivityStore();
      const processedStore = useProcessedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test");

      rawStore.addRawActivity(rawActivity);

      const processed = processedStore.processedActivities[0];
      const transformed = transformedStore.transformedActivities[0];

      expect(transformed?.id).toBe(processed?.id);
      expect(transformed?.name).toBe(processed?.name);
      expect(transformed?.sourceType).toBe(processed?.sourceType);
      expect(transformed?.records).toEqual(processed?.records);
      expect(transformed?.offset).toBe(processed?.offset);
      expect(transformed?.scale).toBe(processed?.scale);
      expect(transformed?.color).toBe(processed?.color);
    });
  });

  describe("getTransformedActivity", () => {
    it("should return transformed activity by id", () => {
      const rawStore = useRawActivityStore();
      const transformedStore = useTransformedActivityStore();

      const rawActivity = createRawActivity("test-1", "Test");

      rawStore.addRawActivity(rawActivity);

      const found = transformedStore.getTransformedActivity("test-1");

      expect(found).toBeDefined();
      expect(found?.id).toBe("test-1");
    });

    it("should return undefined for non-existent id", () => {
      const transformedStore = useTransformedActivityStore();

      const found = transformedStore.getTransformedActivity("non-existent");

      expect(found).toBeUndefined();
    });
  });
});
