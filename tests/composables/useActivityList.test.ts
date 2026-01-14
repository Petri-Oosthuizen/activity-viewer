import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useActivityList } from "~/composables/useActivityList";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import type { RawActivity } from "~/types/activity";

describe("useActivityList", () => {
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

  describe("activities", () => {
    it("should return empty array when no activities", () => {
      const { activities } = useActivityList();
      expect(activities.value).toEqual([]);
    });

    it("should return processed activities", () => {
      const rawStore = useRawActivityStore();
      const rawActivity = createRawActivity("test-1", "Test Activity", [
        { t: 0, d: 0, hr: 100 },
        { t: 10, d: 100, hr: 110 },
      ]);

      rawStore.addRawActivity(rawActivity);

      const { activities } = useActivityList();
      expect(activities.value).toHaveLength(1);
      expect(activities.value[0]?.id).toBe("test-1");
      expect(activities.value[0]?.name).toBe("Test Activity");
    });
  });

  describe("hasActivities", () => {
    it("should return false when no activities", () => {
      const { hasActivities } = useActivityList();
      expect(hasActivities.value).toBe(false);
    });

    it("should return true when activities exist", () => {
      const rawStore = useRawActivityStore();
      const rawActivity = createRawActivity("test-1", "Test Activity", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(rawActivity);

      const { hasActivities } = useActivityList();
      expect(hasActivities.value).toBe(true);
    });
  });

  describe("activeActivities", () => {
    it("should return empty array when no activities", () => {
      const { activeActivities } = useActivityList();
      expect(activeActivities.value).toEqual([]);
    });

    it("should return all activities when none are disabled", () => {
      const rawStore = useRawActivityStore();
      const activity1 = createRawActivity("test-1", "Activity 1", [{ t: 0, d: 0 }]);
      const activity2 = createRawActivity("test-2", "Activity 2", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(activity1);
      rawStore.addRawActivity(activity2);

      const { activeActivities } = useActivityList();
      expect(activeActivities.value).toHaveLength(2);
    });

    it("should exclude disabled activities", () => {
      const rawStore = useRawActivityStore();
      const settingsStore = useActivitySettingsStore();
      const activity1 = createRawActivity("test-1", "Activity 1", [{ t: 0, d: 0 }]);
      const activity2 = createRawActivity("test-2", "Activity 2", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(activity1);
      rawStore.addRawActivity(activity2);
      settingsStore.toggleActivity("test-2");

      const { activeActivities } = useActivityList();
      expect(activeActivities.value).toHaveLength(1);
      expect(activeActivities.value[0]?.id).toBe("test-1");
    });
  });

  describe("removeActivity", () => {
    it("should remove activity from store", () => {
      const rawStore = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(activity);

      const { removeActivity, activities } = useActivityList();
      expect(activities.value).toHaveLength(1);

      removeActivity("test-1");

      expect(activities.value).toHaveLength(0);
    });
  });

  describe("toggleActivity", () => {
    it("should toggle activity disabled state", () => {
      const rawStore = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(activity);

      const { toggleActivity, activeActivities, isActivityDisabled } = useActivityList();
      expect(activeActivities.value).toHaveLength(1);
      expect(isActivityDisabled("test-1")).toBe(false);

      toggleActivity("test-1");

      expect(isActivityDisabled("test-1")).toBe(true);
      expect(activeActivities.value).toHaveLength(0);

      toggleActivity("test-1");

      expect(isActivityDisabled("test-1")).toBe(false);
      expect(activeActivities.value).toHaveLength(1);
    });
  });

  describe("isActivityDisabled", () => {
    it("should return false for enabled activities", () => {
      const rawStore = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(activity);

      const { isActivityDisabled } = useActivityList();
      expect(isActivityDisabled("test-1")).toBe(false);
    });

    it("should return true for disabled activities", () => {
      const rawStore = useRawActivityStore();
      const settingsStore = useActivitySettingsStore();
      const activity = createRawActivity("test-1", "Test Activity", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(activity);
      settingsStore.toggleActivity("test-1");

      const { isActivityDisabled } = useActivityList();
      expect(isActivityDisabled("test-1")).toBe(true);
    });

    it("should return false for non-existent activities", () => {
      const { isActivityDisabled } = useActivityList();
      expect(isActivityDisabled("non-existent")).toBe(false);
    });
  });

  describe("getActivityColor", () => {
    it("should return activity color", () => {
      const rawStore = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(activity);

      const { getActivityColor } = useActivityList();
      const color = getActivityColor("test-1");
      expect(color).toBeDefined();
      expect(typeof color).toBe("string");
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it("should return default color for non-existent activity", () => {
      const { getActivityColor } = useActivityList();
      expect(getActivityColor("non-existent")).toBe("#999");
    });
  });

  describe("getActivityName", () => {
    it("should return activity name", () => {
      const rawStore = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity", [{ t: 0, d: 0 }]);

      rawStore.addRawActivity(activity);

      const { getActivityName } = useActivityList();
      expect(getActivityName("test-1")).toBe("Test Activity");
    });

    it("should return 'Unknown' for non-existent activity", () => {
      const { getActivityName } = useActivityList();
      expect(getActivityName("non-existent")).toBe("Unknown");
    });
  });
});
