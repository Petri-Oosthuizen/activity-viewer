/**
 * Integration tests to ensure components display data correctly
 * Tests that components use the new store architecture and display metrics/graphs/GPS
 * 
 * This test suite prevents regression where components use old store with empty activities array
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import OverviewPanel from "~/components/OverviewPanel.vue";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useProcessedActivityStore } from "~/stores/processedActivity";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useChartSeriesStore } from "~/stores/chartSeries";
import { useWindowActivityStore } from "~/stores/windowActivity";
import type { RawActivity } from "~/types/activity";

describe("Components display data integration", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const createRawActivity = (id: string, name: string, records: Array<{ t: number; d: number; hr?: number; alt?: number }>): RawActivity => ({
    id,
    name,
    sourceType: "gpx",
    fileContent: "test content",
    records: records as any,
    metadata: {},
  });

  describe("OverviewPanel displays data from new stores", () => {
    it("should display metrics when activity is loaded through new store architecture", async () => {
      // 1. Create raw activity with data
      const rawActivity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
        { t: 20, d: 2000, hr: 125, alt: 120 },
      ]);

      // 2. Add to rawActivityStore (simulating file upload)
      const rawStore = useRawActivityStore();
      rawStore.addRawActivity(rawActivity);

      // 3. Configure settings
      const settingsStore = useActivitySettingsStore();
      settingsStore.setOutlierSettings({ mode: "off", maxPercentChange: 200 });
      settingsStore.setGpsSmoothing({ enabled: false, windowPoints: 5 });
      settingsStore.setActivityScale(rawActivity.id, 1.0);
      settingsStore.setActivityOffset(rawActivity.id, 0);

      // 4. Set chart options
      const chartOptionsStore = useChartOptionsStore();
      chartOptionsStore.setXAxisType("distance");
      chartOptionsStore.setViewMode("timeseries");

      // 5. Set window (full window)
      const windowStore = useWindowActivityStore();
      windowStore.setChartWindow({
        xStartPercent: 0,
        xEndPercent: 100,
        yStartPercent: 0,
        yEndPercent: 100,
      });

      // 6. Mount OverviewPanel component
      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      // 7. Verify component displays data (not empty)
      // This test ensures OverviewPanel uses the new stores and displays data
      // If it were using the old store with empty activities array, no data would be displayed
      const text = wrapper.text();
      
      // Should show Duration (proves data is being displayed)
      expect(text).toContain("Duration");
      
      // Should show Distance (proves data is being displayed)
      expect(text).toContain("Distance");
      
      // Should show Min, average, and max values (proves data processing pipeline worked)
      expect(text).toContain("Min, average, and max values");
      
      // Should show metric data (check for at least one metric displayed)
      // The exact metrics depend on the file, but we should see something
      const hasMetricData = text.match(/\d+\s*(bpm|m|W|rpm|km|°C|%)/);
      expect(hasMetricData).toBeTruthy();
      
      // Should show formatted values (proves data processing pipeline worked)
      expect(text).toMatch(/0:\d+/); // Duration format
      expect(text).toMatch(/\d+\.?\d*\s*(km|m)/); // Distance format
    });

    it("should display metrics for multiple activities loaded through new stores", async () => {
      // Create two activities with data
      const rawActivity1 = createRawActivity("test-1", "activity1.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
      ]);
      const rawActivity2 = createRawActivity("test-2", "activity2.gpx", [
        { t: 0, d: 0, hr: 110, alt: 110 },
        { t: 10, d: 1000, hr: 140, alt: 160 },
      ]);

      const rawStore = useRawActivityStore();
      rawStore.addRawActivity(rawActivity1);
      rawStore.addRawActivity(rawActivity2);

      const settingsStore = useActivitySettingsStore();
      settingsStore.setOutlierSettings({ mode: "off", maxPercentChange: 200 });
      settingsStore.setGpsSmoothing({ enabled: false, windowPoints: 5 });
      settingsStore.setActivityScale(rawActivity1.id, 1.0);
      settingsStore.setActivityScale(rawActivity2.id, 1.0);
      settingsStore.setActivityOffset(rawActivity1.id, 0);
      settingsStore.setActivityOffset(rawActivity2.id, 0);

      const chartOptionsStore = useChartOptionsStore();
      chartOptionsStore.setXAxisType("distance");
      chartOptionsStore.setViewMode("timeseries");

      const windowStore = useWindowActivityStore();
      windowStore.setChartWindow({
        xStartPercent: 0,
        xEndPercent: 100,
        yStartPercent: 0,
        yEndPercent: 100,
      });

      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      const text = wrapper.text();
      
      // Should show both activity names
      expect(text).toContain("activity1.gpx");
      expect(text).toContain("activity2.gpx");
      
      // Should show baseline controls (multiple activities)
      expect(text).toContain("Baseline");
      
      // Should show metric data
      const hasMetricData = text.match(/\d+\s*(bpm|m|W|rpm|km|°C|%)/);
      expect(hasMetricData).toBeTruthy();
    });

  });
});
