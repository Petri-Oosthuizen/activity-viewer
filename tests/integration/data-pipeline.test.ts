import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { readFileSync } from "fs";
import { join } from "path";
import { importActivityFile } from "~/utils/activity-importer";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useProcessedActivityStore } from "~/stores/processedActivity";
import { useTransformedActivityStore } from "~/stores/transformedActivity";
import { useWindowActivityStore } from "~/stores/windowActivity";
import { useChartOptionsStore } from "~/stores/chartOptions";
import { useChartSeriesStore } from "~/stores/chartSeries";
import { useActivitySettingsStore } from "~/stores/activitySettings";

const sampleDataDir = join(process.cwd(), "tests", "sampleData", "equivalentActivities", "bronberrik");

describe("data-pipeline integration", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should process file through full pipeline: import → process → transform → window → chart", async () => {
    // 1. Import file
    const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
    const file = new File([gpxContent], "test.gpx", { type: "application/gpx+xml" });

    const rawActivity = await importActivityFile(file);

    expect(rawActivity).toBeDefined();
    expect(rawActivity.sourceType).toBe("gpx");
    expect(rawActivity.records.length).toBeGreaterThan(0);

    // 2. Add to rawActivityStore
    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity);

    expect(rawStore.rawActivities).toHaveLength(1);

    // 3. Configure settings
    const settingsStore = useActivitySettingsStore();
    settingsStore.setOutlierSettings({ mode: "off", maxPercentChange: 200 });
    settingsStore.setGpsSmoothing({ enabled: false, windowPoints: 5 });
    settingsStore.setSmoothing({ mode: "off", windowPoints: 5 });
    settingsStore.setActivityScale(rawActivity.id, 1.0);
    settingsStore.setActivityOffset(rawActivity.id, 0);

    // 4. Verify processedActivities
    const processedStore = useProcessedActivityStore();
    const processed = processedStore.processedActivities;

    expect(processed).toHaveLength(1);
    expect(processed[0]?.id).toBe(rawActivity.id);
    expect(processed[0]?.records.length).toBeGreaterThan(0);
    expect(processed[0]?.records.length).toBeLessThanOrEqual(rawActivity.records.length);

    // 5. Verify transformedActivities (pass-through)
    const transformedStore = useTransformedActivityStore();
    const transformed = transformedStore.transformedActivities;

    expect(transformed).toHaveLength(1);
    expect(transformed[0]?.id).toBe(rawActivity.id);

    // 6. Set chart window (full window for this test)
    const windowStore = useWindowActivityStore();
    windowStore.setChartWindow({
      xStartPercent: 0,
      xEndPercent: 100,
      yStartPercent: 0,
      yEndPercent: 100,
    });

    // 7. Verify windowedActivities
    const windowed = windowStore.windowedActivities;

    expect(windowed).toHaveLength(1);
    expect(windowed[0]?.records.length).toBe(transformed[0]?.records.length);

    // 8. Set chart options
    const chartOptionsStore = useChartOptionsStore();
    chartOptionsStore.setSelectedMetrics(["alt"]);
    chartOptionsStore.setViewMode("timeseries");
    chartOptionsStore.setXAxisType("distance");

    // 9. Verify chartSeries
    const chartSeriesStore = useChartSeriesStore();
    const series = chartSeriesStore.chartSeries;

    expect(series.length).toBeGreaterThan(0);

    // 10. Verify final output structure
    const chartOption = chartSeriesStore.chartOption;

    expect(chartOption).toBeDefined();
    expect(chartOption.tooltip).toBeDefined();
    expect(chartOption.xAxis).toBeDefined();
    expect(chartOption.series).toBeDefined();
  });

  it("should handle multiple activities with different settings", async () => {
    const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
    const file1 = new File([gpxContent], "test1.gpx");
    const file2 = new File([gpxContent], "test2.gpx");

    const rawActivity1 = await importActivityFile(file1);
    const rawActivity2 = await importActivityFile(file2);

    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity1);
    rawStore.addRawActivity(rawActivity2);

    const settingsStore = useActivitySettingsStore();
    settingsStore.setActivityScale(rawActivity1.id, 1.5);
    settingsStore.setActivityOffset(rawActivity2.id, 10);

    const processedStore = useProcessedActivityStore();
    const processed = processedStore.processedActivities;

    expect(processed).toHaveLength(2);
    expect(processed[0]?.scale).toBe(1.5);
    expect(processed[1]?.offset).toBe(10);
  });

  it("should apply window trimming to final chart data", async () => {
    const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
    const file = new File([gpxContent], "test.gpx");

    const rawActivity = await importActivityFile(file);

    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity);

    const processedStore = useProcessedActivityStore();
    const processed = processedStore.processedActivities;

    const windowStore = useWindowActivityStore();
    const chartOptionsStore = useChartOptionsStore();
    chartOptionsStore.setXAxisType("distance");

    // Full window
    windowStore.setChartWindow({
      xStartPercent: 0,
      xEndPercent: 100,
      yStartPercent: 0,
      yEndPercent: 100,
    });

    const windowedFull = windowStore.windowedActivities;
    const fullCount = windowedFull[0]?.records.length || 0;

    // Partial window
    windowStore.setChartWindow({
      xStartPercent: 25,
      xEndPercent: 75,
      yStartPercent: 0,
      yEndPercent: 100,
    });

    const windowedPartial = windowStore.windowedActivities;
    const partialCount = windowedPartial[0]?.records.length || 0;

    expect(partialCount).toBeLessThanOrEqual(fullCount);

    const chartSeriesStore = useChartSeriesStore();
    const series = chartSeriesStore.chartSeries;

    expect(series.length).toBeGreaterThan(0);
  });

  it("should react to settings changes", async () => {
    const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
    const file = new File([gpxContent], "test.gpx");

    const rawActivity = await importActivityFile(file);

    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity);

    const settingsStore = useActivitySettingsStore();
    const processedStore = useProcessedActivityStore();

    const processed1 = processedStore.processedActivities;
    const hr1 = processed1[0]?.records[0]?.hr;

    settingsStore.setActivityScale(rawActivity.id, 2.0);

    // Wait for debounced settings to apply (300ms debounce + small buffer)
    await new Promise((resolve) => setTimeout(resolve, 350));

    const processed2 = processedStore.processedActivities;
    const hr2 = processed2[0]?.records[0]?.hr;

    expect(hr2).toBe(hr1! * 2);
  });
});
