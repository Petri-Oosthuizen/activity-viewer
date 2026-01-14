import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { nextTick } from "vue";
import OverviewPanel from "~/components/OverviewPanel.vue";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useWindowActivityStore } from "~/stores/windowActivity";
import { useChartOptionsStore } from "~/stores/chartOptions";
import type { RawActivity } from "~/types/activity";

describe("OverviewPanel", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const createRawActivity = (
    id: string,
    name: string,
    records: Array<{ t: number; d: number; hr?: number; alt?: number }>,
  ): RawActivity => ({
    id,
    name,
    sourceType: "gpx",
    fileContent: "test content",
    records: records as any,
    metadata: {},
  });

  describe("chart window display", () => {
    it("should not show chart window indicator when window is full (0-100%)", async () => {
      const rawStore = useRawActivityStore();
      const windowStore = useWindowActivityStore();
      const chartOptionsStore = useChartOptionsStore();

      const activity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
        { t: 20, d: 2000, hr: 125, alt: 120 },
      ]);

      rawStore.addRawActivity(activity);
      chartOptionsStore.setXAxisType("distance");
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
      expect(text).not.toContain("Showing visible chart window");
    });

    it("should show chart window indicator with formatted x-axis values for distance", async () => {
      const rawStore = useRawActivityStore();
      const windowStore = useWindowActivityStore();
      const chartOptionsStore = useChartOptionsStore();

      const activity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
        { t: 20, d: 2000, hr: 125, alt: 120 },
      ]);

      rawStore.addRawActivity(activity);
      chartOptionsStore.setXAxisType("distance");
      windowStore.setChartWindow({
        xStartPercent: 25,
        xEndPercent: 75,
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
      expect(text).toContain("Showing visible chart window");
      expect(text).toMatch(/X:\s*\d+(\.\d+)?(km|m)–\d+(\.\d+)?(km|m)/);
    });

    it("should show chart window indicator with formatted x-axis values for time", async () => {
      const rawStore = useRawActivityStore();
      const windowStore = useWindowActivityStore();
      const chartOptionsStore = useChartOptionsStore();

      const activity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 100, d: 1000, hr: 130, alt: 150 },
        { t: 200, d: 2000, hr: 125, alt: 120 },
      ]);

      rawStore.addRawActivity(activity);
      chartOptionsStore.setXAxisType("time");
      windowStore.setChartWindow({
        xStartPercent: 20,
        xEndPercent: 80,
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
      expect(text).toContain("Showing visible chart window");
      expect(text).toMatch(/X:\s*\d+\.\d+s–\d+\.\d+s/);
    });

    it("should show chart window indicator with formatted x-axis values for localTime", async () => {
      const rawStore = useRawActivityStore();
      const windowStore = useWindowActivityStore();
      const chartOptionsStore = useChartOptionsStore();

      const startTime = new Date("2024-01-01T12:00:00Z");
      const activity: RawActivity = {
        id: "test-1",
        name: "test.gpx",
        sourceType: "gpx",
        fileContent: "test content",
        records: [
          { t: 0, d: 0, hr: 120, alt: 100 },
          { t: 100, d: 1000, hr: 130, alt: 150 },
          { t: 200, d: 2000, hr: 125, alt: 120 },
        ] as any,
        metadata: {
          startTime,
        },
      };

      rawStore.addRawActivity(activity);
      chartOptionsStore.setXAxisType("localTime");
      windowStore.setChartWindow({
        xStartPercent: 30,
        xEndPercent: 70,
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
      expect(text).toContain("Showing visible chart window");
      expect(text).toMatch(/X:\s*\d{2}:\d{2}:\d{2}–\d{2}:\d{2}:\d{2}/);
    });

    it("should allow clearing chart window via clear button", async () => {
      const rawStore = useRawActivityStore();
      const windowStore = useWindowActivityStore();
      const chartOptionsStore = useChartOptionsStore();

      const activity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
        { t: 20, d: 2000, hr: 125, alt: 120 },
      ]);

      rawStore.addRawActivity(activity);
      chartOptionsStore.setXAxisType("distance");
      windowStore.setChartWindow({
        xStartPercent: 25,
        xEndPercent: 75,
        yStartPercent: 0,
        yEndPercent: 100,
      });

      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      expect(wrapper.text()).toContain("Showing visible chart window");

      const clearButton = wrapper.find('button[aria-label="Clear chart window"]');
      expect(clearButton.exists()).toBe(true);

      await clearButton.trigger("click");
      await nextTick();

      const updatedText = wrapper.text();
      expect(updatedText).not.toContain("Showing visible chart window");
    });

    it("should not show chart window indicator when no activities", async () => {
      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      const text = wrapper.text();
      expect(text).not.toContain("Showing visible chart window");
    });
  });

  describe("baseline comparison", () => {
    it("should display baseline comparison controls when multiple activities are loaded", async () => {
      const rawStore = useRawActivityStore();

      const activity1 = createRawActivity("test-1", "activity1.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
      ]);

      const activity2 = createRawActivity("test-2", "activity2.gpx", [
        { t: 0, d: 0, hr: 125, alt: 110 },
        { t: 10, d: 1000, hr: 135, alt: 160 },
      ]);

      rawStore.addRawActivity(activity1);
      rawStore.addRawActivity(activity2);

      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      const text = wrapper.text();
      expect(text).toContain("Enable Baseline Comparison");
    });

    it("should not display baseline comparison controls when only one activity is loaded", async () => {
      const rawStore = useRawActivityStore();

      const activity = createRawActivity("test-1", "activity1.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
      ]);

      rawStore.addRawActivity(activity);

      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      const text = wrapper.text();
      expect(text).not.toContain("Enable Baseline Comparison");
    });
  });

  describe("display mode", () => {
    it("should display light mode by default", async () => {
      const rawStore = useRawActivityStore();

      const activity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
      ]);

      rawStore.addRawActivity(activity);

      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      const lightButton = wrapper.find('button[aria-label="Light view"]');
      const fullButton = wrapper.find('button[aria-label="Full details view"]');

      expect(lightButton.exists()).toBe(true);
      expect(fullButton.exists()).toBe(true);
      expect(lightButton.classes()).toContain("bg-primary");
    });

    it("should toggle to full mode when full button is clicked", async () => {
      const rawStore = useRawActivityStore();

      const activity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
      ]);

      rawStore.addRawActivity(activity);

      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      const fullButton = wrapper.find('button[aria-label="Full details view"]');
      await fullButton.trigger("click");
      await nextTick();

      expect(fullButton.classes()).toContain("bg-primary");
    });
  });

  describe("activity statistics display", () => {
    it("should display activity statistics when activity is loaded", async () => {
      const rawStore = useRawActivityStore();

      const activity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
        { t: 20, d: 2000, hr: 125, alt: 120 },
      ]);

      rawStore.addRawActivity(activity);

      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      const text = wrapper.text();
      expect(text).toContain("Duration");
      expect(text).toContain("Distance");
    });

    it("should display metrics in light mode", async () => {
      const rawStore = useRawActivityStore();

      const activity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100 },
        { t: 10, d: 1000, hr: 130, alt: 150 },
      ]);

      rawStore.addRawActivity(activity);

      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      const text = wrapper.text();
      expect(text).toContain("Heart Rate");
      expect(text).toContain("Altitude");
    });

    it("should display additional metrics in full mode", async () => {
      const rawStore = useRawActivityStore();

      const activity = createRawActivity("test-1", "test.gpx", [
        { t: 0, d: 0, hr: 120, alt: 100, cad: 90 },
        { t: 10, d: 1000, hr: 130, alt: 150, cad: 95 },
      ]);

      rawStore.addRawActivity(activity);

      const wrapper = mount(OverviewPanel, {
        global: {
          plugins: [pinia],
        },
      });
      await nextTick();

      const fullButton = wrapper.find('button[aria-label="Full details view"]');
      await fullButton.trigger("click");
      await nextTick();

      const text = wrapper.text();
      expect(text).toContain("Cadence");
    });
  });
});
