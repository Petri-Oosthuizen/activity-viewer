import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { useLocalStoragePersistence } from "~/composables/useLocalStoragePersistence";
import { useActivityStore } from "~/stores/activity";
import type { ActivityRecord } from "~/types/activity";

describe("useLocalStoragePersistence", () => {
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

  it("should initialize with localStorage disabled by default", async () => {
    const TestComponent = defineComponent({
      setup() {
        const { isEnabled } = useLocalStoragePersistence();
        return { isEnabled };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.isEnabled).toBe(false);
    expect(localStorageGetItemSpy).toHaveBeenCalledWith("activity-viewer:localStorageEnabled");
  });

  it("should enable localStorage and save preference", async () => {
    const TestComponent = defineComponent({
      setup() {
        const { isEnabled, setEnabled } = useLocalStoragePersistence();
        return { isEnabled, setEnabled };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    wrapper.vm.setEnabled(true);
    await nextTick();

    expect(wrapper.vm.isEnabled).toBe(true);
    expect(localStorageMock["activity-viewer:localStorageEnabled"]).toBe("true");
  });

  it("should disable localStorage and clear stored data", async () => {
    localStorageMock["activity-viewer:localStorageEnabled"] = "true";
    localStorageMock["activity-viewer:activities"] = JSON.stringify([]);

    const TestComponent = defineComponent({
      setup() {
        const { isEnabled, setEnabled } = useLocalStoragePersistence();
        return { isEnabled, setEnabled };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    wrapper.vm.setEnabled(false);
    await nextTick();

    expect(wrapper.vm.isEnabled).toBe(false);
    expect(localStorageMock["activity-viewer:localStorageEnabled"]).toBeUndefined();
    expect(localStorageMock["activity-viewer:activities"]).toBeUndefined();
  });

  it("should save activities to localStorage when enabled", async () => {
    const store = useActivityStore();
    const records: ActivityRecord[] = [
      { t: 0, d: 0, hr: 120 },
      { t: 1, d: 10, hr: 125 },
    ];
    store.addActivity(records, "Test Activity", undefined, "gpx");

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
    expect(saved[0].name).toBe("Test Activity");
    expect(saved[0].records).toEqual(records);
    expect(saved[0].sourceType).toBe("gpx");
  });

  it("should load activities from localStorage on initialization", async () => {
    const store = useActivityStore();
    const records: ActivityRecord[] = [
      { t: 0, d: 0, hr: 120 },
      { t: 1, d: 10, hr: 125 },
    ];

    const storedActivity = {
      id: "test-id",
      name: "Stored Activity",
      records,
      sourceType: "gpx" as const,
      offset: 5,
      scale: 1.2,
      color: "#000000",
      startTime: new Date("2024-01-01T12:00:00Z").toISOString(),
    };

    localStorageMock["activity-viewer:localStorageEnabled"] = "true";
    localStorageMock["activity-viewer:activities"] = JSON.stringify([storedActivity]);

    const TestComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);
    await nextTick();

    expect(store.activities).toHaveLength(1);
    expect(store.activities[0].name).toBe("Stored Activity");
    expect(store.activities[0].records).toEqual(records);
    expect(store.activities[0].sourceType).toBe("gpx");
    expect(store.activities[0].offset).toBe(5);
    expect(store.activities[0].scale).toBe(1.2);
  });

  it("should not load activities if localStorage is disabled", async () => {
    const store = useActivityStore();
    const records: ActivityRecord[] = [{ t: 0, d: 0 }];

    const storedActivity = {
      id: "test-id",
      name: "Stored Activity",
      records,
      sourceType: "gpx" as const,
      offset: 0,
      scale: 1,
      color: "#000000",
    };

    localStorageMock["activity-viewer:activities"] = JSON.stringify([storedActivity]);

    const TestComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);
    await nextTick();

    expect(store.activities).toHaveLength(0);
  });

  it("should not load activities if store already has activities", async () => {
    const store = useActivityStore();
    const existingRecords: ActivityRecord[] = [{ t: 0, d: 0, hr: 100 }];
    store.addActivity(existingRecords, "Existing Activity");

    const storedRecords: ActivityRecord[] = [{ t: 0, d: 0, hr: 120 }];
    const storedActivity = {
      id: "test-id",
      name: "Stored Activity",
      records: storedRecords,
      sourceType: "gpx" as const,
      offset: 0,
      scale: 1,
      color: "#000000",
    };

    localStorageMock["activity-viewer:localStorageEnabled"] = "true";
    localStorageMock["activity-viewer:activities"] = JSON.stringify([storedActivity]);

    const TestComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);
    await nextTick();

    expect(store.activities).toHaveLength(1);
    expect(store.activities[0].name).toBe("Existing Activity");
  });

  it("should handle localStorage errors gracefully in loadActivities", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const TestComponent = defineComponent({
      setup() {
        const { isEnabled, setEnabled, loadActivities } = useLocalStoragePersistence();
        return { isEnabled, setEnabled, loadActivities };
      },
      template: "<div></div>",
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    wrapper.vm.setEnabled(true);
    await nextTick();

    localStorageGetItemSpy.mockImplementation(() => {
      throw new Error("Storage quota exceeded");
    });

    const result = wrapper.vm.loadActivities();
    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should handle corrupted localStorage data gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorageMock["activity-viewer:localStorageEnabled"] = "true";
    localStorageMock["activity-viewer:activities"] = "invalid json";

    const TestComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);
    await nextTick();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should restore activities with offset and scale", async () => {
    const store = useActivityStore();
    const records: ActivityRecord[] = [{ t: 0, d: 0 }, { t: 10, d: 100 }];

    const storedActivity = {
      id: "test-id",
      name: "Stored Activity",
      records,
      sourceType: "gpx" as const,
      offset: 10,
      scale: 2.0,
      color: "#000000",
    };

    localStorageMock["activity-viewer:localStorageEnabled"] = "true";
    localStorageMock["activity-viewer:activities"] = JSON.stringify([storedActivity]);

    const TestComponent = defineComponent({
      setup() {
        useLocalStoragePersistence();
        return {};
      },
      template: "<div></div>",
    });

    mount(TestComponent);
    await nextTick();

    expect(store.activities).toHaveLength(1);
    expect(store.activities[0].offset).toBe(10);
    expect(store.activities[0].scale).toBe(2.0);
  });
});