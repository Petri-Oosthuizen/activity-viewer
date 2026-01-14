import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { DEFAULT_CHART_TRANSFORM_SETTINGS } from "~/utils/chart-settings";
import { DEFAULT_GPS_DISTANCE_OPTIONS } from "~/utils/gps-distance";

describe("useActivitySettingsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("outlierSettings", () => {
    it("should have default outlier settings", () => {
      const store = useActivitySettingsStore();

      expect(store.outlierSettings).toEqual(DEFAULT_CHART_TRANSFORM_SETTINGS.outliers);
    });

    it("should set outlier settings", () => {
      const store = useActivitySettingsStore();

      const newSettings = { mode: "drop" as const, maxPercentChange: 150 };
      store.setOutlierSettings(newSettings);

      expect(store.outlierSettings).toEqual(newSettings);
    });
  });

  describe("gpsDistanceOptions", () => {
    it("should have default GPS distance options", () => {
      const store = useActivitySettingsStore();

      expect(store.gpsDistanceOptions).toEqual(DEFAULT_GPS_DISTANCE_OPTIONS);
    });

    it("should set GPS distance options", () => {
      const store = useActivitySettingsStore();

      store.setGpsDistanceOptions({ minMoveMeters: 5 });

      expect(store.gpsDistanceOptions.minMoveMeters).toBe(5);
      // Other options should be preserved
      expect(store.gpsDistanceOptions.maxSpeedMps).toBe(DEFAULT_GPS_DISTANCE_OPTIONS.maxSpeedMps);
    });

    it("should merge partial GPS distance options", () => {
      const store = useActivitySettingsStore();

      store.setGpsDistanceOptions({ minMoveMeters: 5 });
      store.setGpsDistanceOptions({ maxSpeedMps: 10 });

      expect(store.gpsDistanceOptions.minMoveMeters).toBe(5);
      expect(store.gpsDistanceOptions.maxSpeedMps).toBe(10);
    });
  });

  describe("gpsSmoothing", () => {
    it("should have default GPS smoothing settings", () => {
      const store = useActivitySettingsStore();

      expect(store.gpsSmoothing).toEqual(DEFAULT_CHART_TRANSFORM_SETTINGS.gpsSmoothing);
    });

    it("should set GPS smoothing settings", () => {
      const store = useActivitySettingsStore();

      const newSettings = { enabled: true, windowPoints: 10 };
      store.setGpsSmoothing(newSettings);

      expect(store.gpsSmoothing).toEqual(newSettings);
    });
  });

  describe("activityOffsets", () => {
    it("should have empty offsets by default", () => {
      const store = useActivitySettingsStore();

      expect(store.activityOffsets.size).toBe(0);
    });

    it("should set activity offset", () => {
      const store = useActivitySettingsStore();

      store.setActivityOffset("activity-1", 5);

      expect(store.activityOffsets.get("activity-1")).toBe(5);
    });

    it("should update existing activity offset", () => {
      const store = useActivitySettingsStore();

      store.setActivityOffset("activity-1", 5);
      store.setActivityOffset("activity-1", 10);

      expect(store.activityOffsets.get("activity-1")).toBe(10);
    });

    it("should handle multiple activity offsets", () => {
      const store = useActivitySettingsStore();

      store.setActivityOffset("activity-1", 5);
      store.setActivityOffset("activity-2", 10);

      expect(store.activityOffsets.get("activity-1")).toBe(5);
      expect(store.activityOffsets.get("activity-2")).toBe(10);
    });
  });

  describe("activityScales", () => {
    it("should have empty scales by default", () => {
      const store = useActivitySettingsStore();

      expect(store.activityScales.size).toBe(0);
    });

    it("should set activity scale", () => {
      const store = useActivitySettingsStore();

      store.setActivityScale("activity-1", 1.5);

      expect(store.activityScales.get("activity-1")).toBe(1.5);
    });

    it("should update existing activity scale", () => {
      const store = useActivitySettingsStore();

      store.setActivityScale("activity-1", 1.5);
      store.setActivityScale("activity-1", 2.0);

      expect(store.activityScales.get("activity-1")).toBe(2.0);
    });
  });

  describe("disabledActivities", () => {
    it("should have empty disabled set by default", () => {
      const store = useActivitySettingsStore();

      expect(store.disabledActivities.size).toBe(0);
    });

    it("should toggle activity disabled state", () => {
      const store = useActivitySettingsStore();

      store.toggleActivity("activity-1");

      expect(store.disabledActivities.has("activity-1")).toBe(true);

      store.toggleActivity("activity-1");

      expect(store.disabledActivities.has("activity-1")).toBe(false);
    });

    it("should handle multiple disabled activities", () => {
      const store = useActivitySettingsStore();

      store.toggleActivity("activity-1");
      store.toggleActivity("activity-2");

      expect(store.disabledActivities.has("activity-1")).toBe(true);
      expect(store.disabledActivities.has("activity-2")).toBe(true);
    });
  });

  describe("deltaSettings", () => {
    it("should have default delta settings", () => {
      const store = useActivitySettingsStore();

      expect(store.deltaSettings.enabled).toBe(false);
      expect(store.deltaSettings.mode).toBe("overlay");
      expect(store.deltaSettings.baseActivityId).toBeNull();
      expect(store.deltaSettings.compareActivityId).toBeNull();
    });

    it("should set delta settings", () => {
      const store = useActivitySettingsStore();

      store.setDeltaSettings({
        enabled: true,
        baseActivityId: "activity-1",
        compareActivityId: "activity-2",
      });

      expect(store.deltaSettings.enabled).toBe(true);
      expect(store.deltaSettings.baseActivityId).toBe("activity-1");
      expect(store.deltaSettings.compareActivityId).toBe("activity-2");
      // Mode should be preserved
      expect(store.deltaSettings.mode).toBe("overlay");
    });

    it("should merge partial delta settings", () => {
      const store = useActivitySettingsStore();

      store.setDeltaSettings({ enabled: true });
      store.setDeltaSettings({ mode: "delta-only" });

      expect(store.deltaSettings.enabled).toBe(true);
      expect(store.deltaSettings.mode).toBe("delta-only");
    });
  });

  describe("clearAll", () => {
    it("should reset all settings to defaults", () => {
      const store = useActivitySettingsStore();

      // Set some values
      store.setOutlierSettings({ mode: "drop", maxPercentChange: 150 });
      store.setGpsDistanceOptions({ minMoveMeters: 5 });
      store.setGpsSmoothing({ enabled: true, windowPoints: 10 });
      store.setActivityOffset("activity-1", 5);
      store.setActivityScale("activity-1", 1.5);
      store.toggleActivity("activity-1");
      store.setDeltaSettings({ enabled: true, baseActivityId: "activity-1" });

      store.clearAll();

      expect(store.outlierSettings).toEqual(DEFAULT_CHART_TRANSFORM_SETTINGS.outliers);
      expect(store.gpsDistanceOptions).toEqual(DEFAULT_GPS_DISTANCE_OPTIONS);
      expect(store.gpsSmoothing).toEqual(DEFAULT_CHART_TRANSFORM_SETTINGS.gpsSmoothing);
      expect(store.activityOffsets.size).toBe(0);
      expect(store.activityScales.size).toBe(0);
      expect(store.disabledActivities.size).toBe(0);
      expect(store.deltaSettings.enabled).toBe(false);
      expect(store.deltaSettings.baseActivityId).toBeNull();
    });
  });
});
