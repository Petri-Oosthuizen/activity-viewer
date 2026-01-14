import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useRawActivityStore } from "~/stores/rawActivity";
import type { RawActivity } from "~/types/activity";

describe("useRawActivityStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const createRawActivity = (id: string, name: string): RawActivity => ({
    id,
    name,
    sourceType: "gpx",
    fileContent: "test content",
    records: [{ t: 0, d: 0 }],
    metadata: {},
  });

  describe("addRawActivity", () => {
    it("should add a new raw activity", () => {
      const store = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity");

      store.addRawActivity(activity);

      expect(store.rawActivities).toHaveLength(1);
      expect(store.rawActivities[0]?.id).toBe("test-1");
      expect(store.rawActivities[0]?.name).toBe("Test Activity");
    });

    it("should add multiple activities", () => {
      const store = useRawActivityStore();
      const activity1 = createRawActivity("test-1", "Activity 1");
      const activity2 = createRawActivity("test-2", "Activity 2");

      store.addRawActivity(activity1);
      store.addRawActivity(activity2);

      expect(store.rawActivities).toHaveLength(2);
      expect(store.rawActivities[0]?.id).toBe("test-1");
      expect(store.rawActivities[1]?.id).toBe("test-2");
    });

    it("should preserve file content and records", () => {
      const store = useRawActivityStore();
      const records = [
        { t: 0, d: 0, hr: 100 },
        { t: 10, d: 100, hr: 110 },
      ];
      const activity: RawActivity = {
        id: "test-1",
        name: "Test",
        sourceType: "gpx",
        fileContent: "file content",
        records,
        metadata: { startTime: new Date() },
      };

      store.addRawActivity(activity);

      expect(store.rawActivities[0]?.fileContent).toBe("file content");
      expect(store.rawActivities[0]?.records).toEqual(records);
      expect(store.rawActivities[0]?.metadata.startTime).toBeDefined();
    });
  });

  describe("removeRawActivity", () => {
    it("should remove activity by id", () => {
      const store = useRawActivityStore();
      const activity1 = createRawActivity("test-1", "Activity 1");
      const activity2 = createRawActivity("test-2", "Activity 2");

      store.addRawActivity(activity1);
      store.addRawActivity(activity2);

      store.removeRawActivity("test-1");

      expect(store.rawActivities).toHaveLength(1);
      expect(store.rawActivities[0]?.id).toBe("test-2");
    });

    it("should do nothing when removing non-existent id", () => {
      const store = useRawActivityStore();
      const activity = createRawActivity("test-1", "Activity 1");

      store.addRawActivity(activity);
      store.removeRawActivity("non-existent");

      expect(store.rawActivities).toHaveLength(1);
    });

    it("should handle removing from empty store", () => {
      const store = useRawActivityStore();

      store.removeRawActivity("test-1");

      expect(store.rawActivities).toHaveLength(0);
    });
  });

  describe("clearAll", () => {
    it("should remove all activities", () => {
      const store = useRawActivityStore();
      const activity1 = createRawActivity("test-1", "Activity 1");
      const activity2 = createRawActivity("test-2", "Activity 2");

      store.addRawActivity(activity1);
      store.addRawActivity(activity2);

      store.clearAll();

      expect(store.rawActivities).toHaveLength(0);
    });

    it("should handle clearing empty store", () => {
      const store = useRawActivityStore();

      store.clearAll();

      expect(store.rawActivities).toHaveLength(0);
    });
  });

  describe("getRawActivity", () => {
    it("should return activity by id", () => {
      const store = useRawActivityStore();
      const activity1 = createRawActivity("test-1", "Activity 1");
      const activity2 = createRawActivity("test-2", "Activity 2");

      store.addRawActivity(activity1);
      store.addRawActivity(activity2);

      const found = store.getRawActivity("test-1");

      expect(found).toBeDefined();
      expect(found?.id).toBe("test-1");
      expect(found?.name).toBe("Activity 1");
    });

    it("should return undefined for non-existent id", () => {
      const store = useRawActivityStore();
      const activity = createRawActivity("test-1", "Activity 1");

      store.addRawActivity(activity);

      const found = store.getRawActivity("non-existent");

      expect(found).toBeUndefined();
    });

    it("should return undefined from empty store", () => {
      const store = useRawActivityStore();

      const found = store.getRawActivity("test-1");

      expect(found).toBeUndefined();
    });
  });
});
