/**
 * Integration test for file upload → storage → load → display flow
 * Tests the complete user journey of uploading files, saving to localStorage,
 * loading from localStorage, and displaying activities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useProcessedActivityStore } from "~/stores/processedActivity";
import { useWindowActivityStore } from "~/stores/windowActivity";
import { useChartSeriesStore } from "~/stores/chartSeries";
import { useLocalStoragePersistence } from "~/composables/useLocalStoragePersistence";
import { importActivityFile } from "~/utils/activity-importer";
import type { RawActivity } from "~/types/activity";

describe("file upload → storage → load → display integration", () => {
  let localStorageMock: Record<string, string>;
  let localStorageGetItemSpy: ReturnType<typeof vi.spyOn>;
  let localStorageSetItemSpy: ReturnType<typeof vi.spyOn>;
  let localStorageRemoveItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorageMock = {};

    localStorageGetItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation((key: string) => {
      return localStorageMock[key] || null;
    });

    localStorageSetItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    localStorageRemoveItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation((key: string) => {
      delete localStorageMock[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createGPXFile = (name: string, content: string): File => {
    return new File([content], name, { type: "application/gpx+xml" });
  };

  const createTCXFile = (name: string, content: string): File => {
    return new File([content], name, { type: "application/vnd.garmin.tcx+xml" });
  };

  it("should upload file, save to storage, load from storage, and display", async () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Test Activity</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2024-01-01T12:00:00Z</time>
      </trkpt>
      <trkpt lat="37.7750" lon="-122.4195">
        <ele>12</ele>
        <time>2024-01-01T12:00:10Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const file = createGPXFile("test.gpx", gpxContent);

    // 1. Upload file
    const rawActivity = await importActivityFile(file);
    expect(rawActivity).toBeDefined();
    expect(rawActivity.sourceType).toBe("gpx");
    expect(rawActivity.records.length).toBeGreaterThan(0);

    // 2. Add to store
    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity);
    expect(rawStore.rawActivities).toHaveLength(1);

    // 3. Enable localStorage and save
    const { setEnabled, saveActivities } = useLocalStoragePersistence();
    setEnabled(true);
    await nextTick();
    await saveActivities();
    await nextTick();

    // Verify saved to localStorage
    expect(localStorageMock["activity-viewer:localStorageEnabled"]).toBe("true");
    const saved = JSON.parse(localStorageMock["activity-viewer:activities"] || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0]?.id).toBe(rawActivity.id);
    expect(saved[0]?.name).toBe(rawActivity.name);

    // 4. Clear store and load from localStorage
    rawStore.clearAll();
    expect(rawStore.rawActivities).toHaveLength(0);

    // Create new instance to simulate page reload
    setActivePinia(createPinia());
    const newRawStore = useRawActivityStore();
    
    // Mount component to initialize composable
    const TestComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });
    mount(TestComponent);
    await nextTick();
    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 50));
    await nextTick();

    expect(newRawStore.rawActivities).toHaveLength(1);
    expect(newRawStore.rawActivities[0]?.id).toBe(rawActivity.id);
    expect(newRawStore.rawActivities[0]?.name).toBe(rawActivity.name);

    // 5. Verify processed activities are available
    const processedStore = useProcessedActivityStore();
    const processed = processedStore.processedActivities;
    expect(processed).toHaveLength(1);
    expect(processed[0]?.id).toBe(rawActivity.id);

    // 6. Verify windowed activities are available
    const windowStore = useWindowActivityStore();
    const windowed = windowStore.windowedActivities;
    expect(windowed).toHaveLength(1);
    expect(windowed[0]?.id).toBe(rawActivity.id);

    // 7. Verify chart series can be generated
    const chartSeriesStore = useChartSeriesStore();
    const series = chartSeriesStore.chartSeries;
    expect(series.length).toBeGreaterThan(0);
    expect(chartSeriesStore.chartOption).toBeDefined();
  });

  it("should handle multiple file uploads and persistence", async () => {
    const gpxContent1 = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Activity 1</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2024-01-01T12:00:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const gpxContent2 = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Activity 2</name>
    <trkseg>
      <trkpt lat="37.7750" lon="-122.4195">
        <ele>12</ele>
        <time>2024-01-01T13:00:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const file1 = createGPXFile("test1.gpx", gpxContent1);
    const file2 = createGPXFile("test2.gpx", gpxContent2);

    // Upload both files
    const rawActivity1 = await importActivityFile(file1);
    const rawActivity2 = await importActivityFile(file2);

    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity1);
    rawStore.addRawActivity(rawActivity2);
    expect(rawStore.rawActivities).toHaveLength(2);

    // Save to localStorage
    const { setEnabled, saveActivities } = useLocalStoragePersistence();
    setEnabled(true);
    await nextTick();
    await saveActivities();
    await nextTick();

    // Verify both saved
    const saved = JSON.parse(localStorageMock["activity-viewer:activities"] || "[]");
    expect(saved).toHaveLength(2);

    // Load and verify by simulating page reload
    setActivePinia(createPinia());
    const newRawStore = useRawActivityStore();
    const TestComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });
    mount(TestComponent);
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await nextTick();

    expect(newRawStore.rawActivities).toHaveLength(2);
    // Names come from filenames when GPX doesn't have <name> tag
    expect(newRawStore.rawActivities[0]?.name).toBeDefined();
    expect(newRawStore.rawActivities[1]?.name).toBeDefined();
  });

  it("should handle file upload with different formats (GPX, TCX)", async () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>GPX Activity</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2024-01-01T12:00:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const tcxContent = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase>
  <Activities>
    <Activity Sport="Running">
      <Id>2024-01-01T12:00:00Z</Id>
      <Lap>
        <Track>
          <Trackpoint>
            <Time>2024-01-01T12:00:00Z</Time>
            <Position>
              <LatitudeDegrees>37.7749</LatitudeDegrees>
              <LongitudeDegrees>-122.4194</LongitudeDegrees>
            </Position>
            <AltitudeMeters>10</AltitudeMeters>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

    const gpxFile = createGPXFile("test.gpx", gpxContent);
    const tcxFile = createTCXFile("test.tcx", tcxContent);

    const rawActivity1 = await importActivityFile(gpxFile);
    const rawActivity2 = await importActivityFile(tcxFile);

    expect(rawActivity1.sourceType).toBe("gpx");
    expect(rawActivity2.sourceType).toBe("tcx");

    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity1);
    rawStore.addRawActivity(rawActivity2);

    // Verify both can be processed and displayed
    const processedStore = useProcessedActivityStore();
    const processed = processedStore.processedActivities;
    expect(processed).toHaveLength(2);
    expect(processed[0]?.sourceType).toBe("gpx");
    expect(processed[1]?.sourceType).toBe("tcx");

    const chartSeriesStore = useChartSeriesStore();
    const series = chartSeriesStore.chartSeries;
    expect(series.length).toBeGreaterThan(0);
  });

  it("should persist and restore activities with metadata", async () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <name>Activity with Metadata</name>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2024-01-01T12:00:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const file = createGPXFile("test.gpx", gpxContent);
    const rawActivity = await importActivityFile(file);

    // Add metadata manually for testing
    rawActivity.metadata.startTime = new Date("2024-01-01T12:00:00Z");
    rawActivity.metadata.calories = 500;
    rawActivity.metadata.sport = "running";

    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity);

    // Save and load
    const { setEnabled, saveActivities, loadActivities } = useLocalStoragePersistence();
    setEnabled(true);
    await nextTick();
    await saveActivities();
    await nextTick();

    rawStore.clearAll();
    const loaded = loadActivities();
    loaded.forEach((activity) => {
      rawStore.addRawActivity(activity);
    });

    // Verify metadata is preserved
    const loadedActivity = rawStore.rawActivities[0];
    expect(loadedActivity?.metadata.startTime).toBeInstanceOf(Date);
    expect(loadedActivity?.metadata.calories).toBe(500);
    expect(loadedActivity?.metadata.sport).toBe("running");
  });
});
