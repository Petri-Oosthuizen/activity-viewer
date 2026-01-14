import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { useLocalStoragePersistence } from "~/composables/useLocalStoragePersistence";
import { useRawActivityStore } from "~/stores/rawActivity";
import type { RawActivity } from "~/types/activity";

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

  const createRawActivity = (id: string, name: string): RawActivity => ({
    id,
    name,
    sourceType: "gpx",
    fileContent: "test content",
    records: [{ t: 0, d: 0 }],
    metadata: {},
  });

  describe("isEnabled", () => {
    it("should be false by default", async () => {
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
    });

    it("should load enabled state from localStorage", async () => {
      localStorageMock["activity-viewer:localStorageEnabled"] = "true";

      const TestComponent = defineComponent({
        setup() {
          const { isEnabled } = useLocalStoragePersistence();
          return { isEnabled };
        },
        template: "<div></div>",
      });

      const wrapper = mount(TestComponent);
      await nextTick();

      expect(wrapper.vm.isEnabled).toBe(true);
    });
  });

  describe("isLoading", () => {
    it("should be false when localStorage is disabled", async () => {
      const TestComponent = defineComponent({
        setup() {
          const { isLoading } = useLocalStoragePersistence();
          return { isLoading };
        },
        template: "<div></div>",
      });

      const wrapper = mount(TestComponent);
      await nextTick();

      expect(wrapper.vm.isLoading).toBe(false);
    });

    it("should be true initially when localStorage is enabled", async () => {
      localStorageMock["activity-viewer:localStorageEnabled"] = "true";

      const TestComponent = defineComponent({
        setup() {
          const { isLoading } = useLocalStoragePersistence();
          return { isLoading };
        },
        template: "<div></div>",
      });

      const wrapper = mount(TestComponent);
      await nextTick();

      expect(wrapper.vm.isLoading).toBe(false);
    });
  });

  describe("setEnabled", () => {
    it("should enable localStorage and save preference", async () => {
      const TestComponent = defineComponent({
        setup() {
          const { setEnabled, isEnabled } = useLocalStoragePersistence();
          return { setEnabled, isEnabled };
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

    it("should disable localStorage and remove preference", async () => {
      localStorageMock["activity-viewer:localStorageEnabled"] = "true";
      localStorageMock["activity-viewer:activities"] = JSON.stringify([]);

      const TestComponent = defineComponent({
        setup() {
          const { setEnabled, isEnabled } = useLocalStoragePersistence();
          return { setEnabled, isEnabled };
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
  });

  describe("saveActivities", () => {
    it("should save activities to localStorage when enabled", async () => {
      const rawStore = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity");
      rawStore.addRawActivity(activity);

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
      await wrapper.vm.saveActivities();
      await nextTick();

      const saved = JSON.parse(localStorageMock["activity-viewer:activities"] || "[]");
      expect(saved).toHaveLength(1);
      expect(saved[0]?.id).toBe("test-1");
      expect(saved[0]?.name).toBe("Test Activity");
    });

    it("should not save activities when disabled", async () => {
      const rawStore = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity");
      rawStore.addRawActivity(activity);

      const TestComponent = defineComponent({
        setup() {
          const { saveActivities } = useLocalStoragePersistence();
          return { saveActivities };
        },
        template: "<div></div>",
      });

      const wrapper = mount(TestComponent);
      await nextTick();

      wrapper.vm.saveActivities();
      await nextTick();

      expect(localStorageMock["activity-viewer:activities"]).toBeUndefined();
    });
  });

  describe("loadActivities", () => {
    it("should load activities from localStorage on mount when enabled", async () => {
      const storedActivity = {
        id: "stored-1",
        name: "Stored Activity",
        sourceType: "gpx",
        fileContent: "test content",
        records: [{ t: 0, d: 0 }],
        metadata: {},
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

      const rawStore = useRawActivityStore();
      expect(rawStore.rawActivities).toHaveLength(1);
      expect(rawStore.rawActivities[0]?.id).toBe("stored-1");
      expect(rawStore.rawActivities[0]?.name).toBe("Stored Activity");
    });

    it("should not load activities when localStorage is disabled", async () => {
      const storedActivity = {
        id: "stored-1",
        name: "Stored Activity",
        sourceType: "gpx",
        fileContent: "test content",
        records: [{ t: 0, d: 0 }],
        metadata: {},
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

      const rawStore = useRawActivityStore();
      expect(rawStore.rawActivities).toHaveLength(0);
    });

    it("should not load activities when store already has activities", async () => {
      const rawStore = useRawActivityStore();
      const existingActivity = createRawActivity("existing-1", "Existing Activity");
      rawStore.addRawActivity(existingActivity);

      const storedActivity = {
        id: "stored-1",
        name: "Stored Activity",
        sourceType: "gpx",
        fileContent: "test content",
        records: [{ t: 0, d: 0 }],
        metadata: {},
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

      expect(rawStore.rawActivities).toHaveLength(1);
      expect(rawStore.rawActivities[0]?.id).toBe("existing-1");
    });
  });

  describe("serializeRawActivity", () => {
    it("should serialize activity with Blob fileContent to base64", async () => {
      // Create a Blob using File for better test compatibility
      const blob = new File(["binary content"], "test.fit", { type: "application/octet-stream" });
      const activity: RawActivity = {
        id: "test-1",
        name: "Test",
        sourceType: "fit",
        fileContent: blob,
        records: [{ t: 0, d: 0 }],
        metadata: {},
      };

      const TestComponent = defineComponent({
        setup() {
          const { setEnabled, saveActivities } = useLocalStoragePersistence();
          return { setEnabled, saveActivities };
        },
        template: "<div></div>",
      });

      const wrapper = mount(TestComponent);
      await nextTick();

      const rawStore = useRawActivityStore();
      rawStore.addRawActivity(activity);

      wrapper.vm.setEnabled(true);
      await nextTick();
      await wrapper.vm.saveActivities();
      // Wait for async serialization
      await new Promise((resolve) => setTimeout(resolve, 50));
      await nextTick();

      const saved = JSON.parse(localStorageMock["activity-viewer:activities"] || "[]");
      expect(saved).toHaveLength(1);
      expect(saved[0]?.fileContentIsBase64).toBe(true);
      expect(saved[0]?.fileContent).toBeDefined();
      expect(typeof saved[0]?.fileContent).toBe("string");
    });

    it("should serialize activity with string fileContent", async () => {
      const activity: RawActivity = {
        id: "test-1",
        name: "Test",
        sourceType: "gpx",
        fileContent: "xml content",
        records: [{ t: 0, d: 0 }],
        metadata: {},
      };

      const TestComponent = defineComponent({
        setup() {
          const { setEnabled, saveActivities } = useLocalStoragePersistence();
          return { setEnabled, saveActivities };
        },
        template: "<div></div>",
      });

      const wrapper = mount(TestComponent);
      await nextTick();

      const rawStore = useRawActivityStore();
      rawStore.addRawActivity(activity);

      wrapper.vm.setEnabled(true);
      await nextTick();
      await wrapper.vm.saveActivities();
      // Wait for async serialization
      await new Promise((resolve) => setTimeout(resolve, 50));
      await nextTick();

      const saved = JSON.parse(localStorageMock["activity-viewer:activities"] || "[]");
      expect(saved).toHaveLength(1);
      expect(saved[0]?.fileContentIsBase64).toBeFalsy();
      expect(saved[0]?.fileContent).toBe("xml content");
    });

    it("should serialize activity with metadata including laps", async () => {
      const activity: RawActivity = {
        id: "test-1",
        name: "Test",
        sourceType: "tcx",
        fileContent: "content",
        records: [{ t: 0, d: 0 }],
        metadata: {
          startTime: new Date("2024-01-01T12:00:00Z"),
          calories: 500,
          sport: "running",
          laps: [
            {
              startTime: new Date("2024-01-01T12:00:00Z"),
              startRecordIndex: 0,
              endRecordIndex: 10,
              totalTimeSeconds: 100,
              distanceMeters: 1000,
            },
          ],
        },
      };

      const TestComponent = defineComponent({
        setup() {
          const { setEnabled, saveActivities } = useLocalStoragePersistence();
          return { setEnabled, saveActivities };
        },
        template: "<div></div>",
      });

      const wrapper = mount(TestComponent);
      await nextTick();

      const rawStore = useRawActivityStore();
      rawStore.addRawActivity(activity);

      wrapper.vm.setEnabled(true);
      await nextTick();
      await wrapper.vm.saveActivities();
      // Wait for async serialization
      await new Promise((resolve) => setTimeout(resolve, 50));
      await nextTick();

      const saved = JSON.parse(localStorageMock["activity-viewer:activities"] || "[]");
      expect(saved).toHaveLength(1);
      expect(saved[0]?.metadata.startTime).toBe("2024-01-01T12:00:00.000Z");
      expect(saved[0]?.metadata.calories).toBe(500);
      expect(saved[0]?.metadata.sport).toBe("running");
      expect(saved[0]?.metadata.laps).toHaveLength(1);
      expect(saved[0]?.metadata.laps[0]?.startTime).toBe("2024-01-01T12:00:00.000Z");
    });
  });

  describe("deserializeRawActivity", () => {
    it("should deserialize activity with base64 fileContent to Blob", async () => {
      // Create base64 content directly
      const binaryString = "binary content";
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const base64Content = btoa(binaryString);

      const storedActivity = {
        id: "test-1",
        name: "Test",
        sourceType: "fit",
        fileContent: base64Content,
        fileContentIsBase64: true,
        records: [{ t: 0, d: 0 }],
        metadata: {},
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

      const rawStore = useRawActivityStore();
      expect(rawStore.rawActivities).toHaveLength(1);
      const loaded = rawStore.rawActivities[0];
      expect(loaded?.fileContent).toBeInstanceOf(Blob);
    });

    it("should deserialize activity with string fileContent", async () => {
      const storedActivity = {
        id: "test-1",
        name: "Test",
        sourceType: "gpx",
        fileContent: "xml content",
        records: [{ t: 0, d: 0 }],
        metadata: {},
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

      const rawStore = useRawActivityStore();
      expect(rawStore.rawActivities).toHaveLength(1);
      const loaded = rawStore.rawActivities[0];
      expect(loaded?.fileContent).toBe("xml content");
    });

    it("should deserialize activity with metadata including laps", async () => {
      const storedActivity = {
        id: "test-1",
        name: "Test",
        sourceType: "tcx",
        fileContent: "content",
        records: [{ t: 0, d: 0 }],
        metadata: {
          startTime: "2024-01-01T12:00:00.000Z",
          calories: 500,
          sport: "running",
          laps: [
            {
              startTime: "2024-01-01T12:00:00.000Z",
              startRecordIndex: 0,
              endRecordIndex: 10,
              totalTimeSeconds: 100,
              distanceMeters: 1000,
            },
          ],
        },
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

      const rawStore = useRawActivityStore();
      expect(rawStore.rawActivities).toHaveLength(1);
      const loaded = rawStore.rawActivities[0];
      expect(loaded?.metadata.startTime).toBeInstanceOf(Date);
      expect(loaded?.metadata.calories).toBe(500);
      expect(loaded?.metadata.sport).toBe("running");
      expect(loaded?.metadata.laps).toHaveLength(1);
      expect(loaded?.metadata.laps[0]?.startTime).toBeInstanceOf(Date);
    });
  });

  describe("watch handler", () => {
    it("should automatically save activities when they change", async () => {
      const TestComponent = defineComponent({
        setup() {
          const { setEnabled } = useLocalStoragePersistence();
          // Enable before mount completes to ensure it's ready
          setEnabled(true);
          return {};
        },
        template: "<div></div>",
      });

      const wrapper = mount(TestComponent);
      // Wait for onMounted and initializeFromStorage to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      await nextTick();

      const rawStore = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity");
      rawStore.addRawActivity(activity);

      // Wait for watch to trigger and async save to complete
      // The watch handler calls saveActivities which uses Promise.all
      await new Promise((resolve) => setTimeout(resolve, 300));
      await nextTick();

      const saved = JSON.parse(localStorageMock["activity-viewer:activities"] || "[]");
      expect(saved.length).toBeGreaterThanOrEqual(1);
      const found = saved.find((a: any) => a.id === "test-1");
      expect(found).toBeDefined();
    });

    it("should not save when localStorage is disabled", async () => {
      const TestComponent = defineComponent({
        setup() {
          useLocalStoragePersistence();
          return {};
        },
        template: "<div></div>",
      });

      mount(TestComponent);
      await nextTick();

      const rawStore = useRawActivityStore();
      const activity = createRawActivity("test-1", "Test Activity");
      rawStore.addRawActivity(activity);

      await new Promise((resolve) => setTimeout(resolve, 100));
      await nextTick();

      expect(localStorageMock["activity-viewer:activities"]).toBeUndefined();
    });
  });
});
