import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { readFileSync } from "fs";
import { join } from "path";
import { useLocalStoragePersistence } from "~/composables/useLocalStoragePersistence";
import { useActivityStore } from "~/stores/activity";
import { parseGPX } from "~/utils/gpx-parser";
import { parseTCX } from "~/utils/tcx-parser";
import { parseFIT } from "~/utils/fit-parser";
import type { Activity } from "~/types/activity";

describe("useLocalStoragePersistence - Full Data Persistence", () => {
  let localStorageMock: Record<string, string>;
  let localStorageGetItemSpy: ReturnType<typeof vi.spyOn>;
  let localStorageSetItemSpy: ReturnType<typeof vi.spyOn>;
  let localStorageRemoveItemSpy: ReturnType<typeof vi.spyOn>;

  const sampleDataDir = join(process.cwd(), "tests", "sampleData", "equivalentActivities", "bronberrik");

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

  function compareActivities(original: Activity, restored: Activity) {
    expect(restored.name).toBe(original.name);
    expect(restored.sourceType).toBe(original.sourceType);
    expect(restored.offset).toBe(original.offset);
    expect(restored.scale).toBe(original.scale);
    expect(restored.color).toBe(original.color);
    expect(restored.calories).toBe(original.calories);
    expect(restored.sport).toBe(original.sport);
    
    if (original.startTime) {
      expect(restored.startTime).toBeInstanceOf(Date);
      expect(restored.startTime?.getTime()).toBe(original.startTime.getTime());
    } else {
      expect(restored.startTime).toBeUndefined();
    }

    expect(restored.records.length).toBe(original.records.length);
    
    for (let i = 0; i < original.records.length; i++) {
      const origRecord = original.records[i]!;
      const restoredRecord = restored.records[i]!;
      
      expect(restoredRecord.t).toBe(origRecord.t);
      expect(restoredRecord.d).toBe(origRecord.d);
      expect(restoredRecord.lat).toBe(origRecord.lat);
      expect(restoredRecord.lon).toBe(origRecord.lon);
      expect(restoredRecord.hr).toBe(origRecord.hr);
      expect(restoredRecord.pwr).toBe(origRecord.pwr);
      expect(restoredRecord.alt).toBe(origRecord.alt);
      expect(restoredRecord.cad).toBe(origRecord.cad);
      expect(restoredRecord.speed).toBe(origRecord.speed);
      expect(restoredRecord.temp).toBe(origRecord.temp);
      expect(restoredRecord.grade).toBe(origRecord.grade);
      expect(restoredRecord.vSpeed).toBe(origRecord.vSpeed);
      
      if (origRecord.additionalFields) {
        expect(restoredRecord.additionalFields).toBeDefined();
        expect(restoredRecord.additionalFields).toEqual(origRecord.additionalFields);
      } else {
        expect(restoredRecord.additionalFields).toBeUndefined();
      }
    }

    if (original.laps) {
      expect(restored.laps).toBeDefined();
      expect(restored.laps?.length).toBe(original.laps.length);
      
      for (let i = 0; i < original.laps.length; i++) {
        const origLap = original.laps[i]!;
        const restoredLap = restored.laps![i]!;
        
        expect(restoredLap.startTime).toBeInstanceOf(Date);
        expect(restoredLap.startTime.getTime()).toBe(origLap.startTime.getTime());
        expect(restoredLap.startRecordIndex).toBe(origLap.startRecordIndex);
        expect(restoredLap.endRecordIndex).toBe(origLap.endRecordIndex);
        expect(restoredLap.totalTimeSeconds).toBe(origLap.totalTimeSeconds);
        expect(restoredLap.distanceMeters).toBe(origLap.distanceMeters);
        expect(restoredLap.calories).toBe(origLap.calories);
        expect(restoredLap.averageHeartRateBpm).toBe(origLap.averageHeartRateBpm);
        expect(restoredLap.maximumHeartRateBpm).toBe(origLap.maximumHeartRateBpm);
        expect(restoredLap.averageCadence).toBe(origLap.averageCadence);
        expect(restoredLap.maximumCadence).toBe(origLap.maximumCadence);
        expect(restoredLap.averageSpeed).toBe(origLap.averageSpeed);
        expect(restoredLap.maximumSpeed).toBe(origLap.maximumSpeed);
        expect(restoredLap.intensity).toBe(origLap.intensity);
        expect(restoredLap.triggerMethod).toBe(origLap.triggerMethod);
      }
    } else {
      expect(restored.laps).toBeUndefined();
    }
  }

  it("should save GPX file with all data including calories, sport, laps, and additionalFields", async () => {
    const store = useActivityStore();
    const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
    const parseResult = parseGPX(gpxContent);
    
    store.addActivity(
      parseResult.records,
      "bronberrik.gpx",
      parseResult.startTime,
      "gpx",
      parseResult.calories,
      parseResult.sport,
      parseResult.laps
    );

    const originalActivity = store.activities[0]!;
    store.updateOffset(originalActivity.id, 5);
    store.updateScale(originalActivity.id, 1.5);

    const TestComponent = defineComponent({
      setup() {
        const { setEnabled, saveActivities } = useLocalStoragePersistence();
        return { setEnabled, saveActivities };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    wrapper.vm.setEnabled(true);
    await nextTick();
    wrapper.vm.saveActivities();
    await nextTick();

    const saved = JSON.parse(localStorageMock["activity-viewer:activities"]);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("bronberrik.gpx");
    expect(saved[0].sourceType).toBe("gpx");
    expect(saved[0].calories).toBe(parseResult.calories);
    expect(saved[0].sport).toBe(parseResult.sport);
    expect(saved[0].offset).toBe(5);
    expect(saved[0].scale).toBe(1.5);
    if (parseResult.laps) {
      expect(saved[0].laps).toBeDefined();
      expect(saved[0].laps.length).toBe(parseResult.laps.length);
    }
    expect(saved[0].records).toBeDefined();
    expect(saved[0].records.length).toBeGreaterThan(0);
    
    if (parseResult.records.some(r => r.additionalFields)) {
      const recordWithAdditionalFields = saved[0].records.find((r: any) => r.additionalFields);
      expect(recordWithAdditionalFields).toBeDefined();
    }
  });

  it("should save and restore TCX file with all data", async () => {
    const store = useActivityStore();
    const tcxContent = readFileSync(join(sampleDataDir, "bronberrik.tcx"), "utf-8");
    const parseResult = parseTCX(tcxContent);
    
    store.addActivity(
      parseResult.records,
      "bronberrik.tcx",
      parseResult.startTime,
      "tcx",
      parseResult.calories,
      parseResult.sport,
      parseResult.laps
    );

    store.updateOffset(store.activities[0]!.id, 10);
    store.updateScale(store.activities[0]!.id, 2.0);
    const originalActivity = store.activities[0]!;

    const TestComponent = defineComponent({
      setup() {
        const { setEnabled, saveActivities } = useLocalStoragePersistence();
        return { setEnabled, saveActivities };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    wrapper.vm.setEnabled(true);
    await nextTick();
    wrapper.vm.saveActivities();
    await nextTick();

    const saved = JSON.parse(localStorageMock["activity-viewer:activities"]);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("bronberrik.tcx");
    expect(saved[0].sourceType).toBe("tcx");
    expect(saved[0].calories).toBe(parseResult.calories);
    expect(saved[0].sport).toBe(parseResult.sport);

    setActivePinia(createPinia());
    const restoredStore = useActivityStore();
    localStorageMock["activity-viewer:localStorageEnabled"] = "true";
    
    const RestoreComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(RestoreComponent);
    await nextTick();

    expect(restoredStore.activities).toHaveLength(1);
    const restoredActivity = restoredStore.activities[0]!;
    compareActivities(originalActivity, restoredActivity);
  });

  it("should save and restore FIT file with all data including additionalFields", async () => {
    const store = useActivityStore();
    const fitBuffer = readFileSync(join(sampleDataDir, "bronberrik.fit"));
    const parseResult = await parseFIT(fitBuffer);
    
    store.addActivity(
      parseResult.records,
      "bronberrik.fit",
      parseResult.startTime,
      "fit",
      parseResult.calories,
      parseResult.sport,
      parseResult.laps
    );

    store.updateOffset(store.activities[0]!.id, 15);
    store.updateScale(store.activities[0]!.id, 0.8);
    const originalActivity = store.activities[0]!;

    const TestComponent = defineComponent({
      setup() {
        const { setEnabled, saveActivities } = useLocalStoragePersistence();
        return { setEnabled, saveActivities };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    wrapper.vm.setEnabled(true);
    await nextTick();
    wrapper.vm.saveActivities();
    await nextTick();

    const saved = JSON.parse(localStorageMock["activity-viewer:activities"]);
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("bronberrik.fit");
    expect(saved[0].sourceType).toBe("fit");
    expect(saved[0].calories).toBe(parseResult.calories);
    expect(saved[0].sport).toBe(parseResult.sport);
    
    if (parseResult.records.some(r => r.additionalFields)) {
      const recordWithAdditionalFields = parseResult.records.find(r => r.additionalFields);
      expect(recordWithAdditionalFields).toBeDefined();
      const savedRecord = saved[0].records.find((r: any) => r.additionalFields);
      expect(savedRecord).toBeDefined();
      expect(savedRecord.additionalFields).toEqual(recordWithAdditionalFields!.additionalFields);
    }

    setActivePinia(createPinia());
    const restoredStore = useActivityStore();
    localStorageMock["activity-viewer:localStorageEnabled"] = "true";
    
    const RestoreComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(RestoreComponent);
    await nextTick();

    expect(restoredStore.activities).toHaveLength(1);
    const restoredActivity = restoredStore.activities[0]!;
    compareActivities(originalActivity, restoredActivity);
  });

  it("should save and restore multiple activities with all data", async () => {
    const store = useActivityStore();
    
    const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
    const gpxResult = parseGPX(gpxContent);
    store.addActivity(gpxResult.records, "bronberrik.gpx", gpxResult.startTime, "gpx", gpxResult.calories, gpxResult.sport, gpxResult.laps);
    
    const tcxContent = readFileSync(join(sampleDataDir, "bronberrik.tcx"), "utf-8");
    const tcxResult = parseTCX(tcxContent);
    store.addActivity(tcxResult.records, "bronberrik.tcx", tcxResult.startTime, "tcx", tcxResult.calories, tcxResult.sport, tcxResult.laps);
    
    const fitBuffer = readFileSync(join(sampleDataDir, "bronberrik.fit"));
    const fitResult = await parseFIT(fitBuffer);
    store.addActivity(fitResult.records, "bronberrik.fit", fitResult.startTime, "fit", fitResult.calories, fitResult.sport, fitResult.laps);

    store.updateOffset(store.activities[0]!.id, 5);
    store.updateScale(store.activities[0]!.id, 1.5);
    store.updateOffset(store.activities[1]!.id, 10);
    store.updateScale(store.activities[2]!.id, 2.0);
    
    const originalActivities = [...store.activities];

    const TestComponent = defineComponent({
      setup() {
        const { setEnabled, saveActivities } = useLocalStoragePersistence();
        return { setEnabled, saveActivities };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    wrapper.vm.setEnabled(true);
    await nextTick();
    wrapper.vm.saveActivities();
    await nextTick();

    const saved = JSON.parse(localStorageMock["activity-viewer:activities"]);
    expect(saved).toHaveLength(3);
    expect(saved[0].name).toBe("bronberrik.gpx");
    expect(saved[1].name).toBe("bronberrik.tcx");
    expect(saved[2].name).toBe("bronberrik.fit");
    expect(saved[0].calories).toBe(gpxResult.calories);
    expect(saved[1].calories).toBe(tcxResult.calories);
    expect(saved[2].calories).toBe(fitResult.calories);

    setActivePinia(createPinia());
    const restoredStore = useActivityStore();
    localStorageMock["activity-viewer:localStorageEnabled"] = "true";
    
    const RestoreComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(RestoreComponent);
    await nextTick();

    expect(restoredStore.activities).toHaveLength(3);
    for (let i = 0; i < originalActivities.length; i++) {
      compareActivities(originalActivities[i]!, restoredStore.activities[i]!);
    }
  });
});
