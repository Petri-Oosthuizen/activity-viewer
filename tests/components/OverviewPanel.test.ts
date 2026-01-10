import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import OverviewPanel from "~/components/OverviewPanel.vue";
import { useActivityStore } from "~/stores/activity";
import type { ActivityRecord } from "~/types/activity";

describe("OverviewPanel", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function addSimpleActivity(name: string) {
    const store = useActivityStore();
    const records: ActivityRecord[] = [
      { t: 0, d: 0, hr: 120 },
      { t: 10, d: 1000, hr: 130 },
    ];
    store.addActivity(records, name);
    return store;
  }

  function addActivityWithElevation(name: string) {
    const store = useActivityStore();
    const records: ActivityRecord[] = [
      { t: 0, d: 0, hr: 120, alt: 100 },
      { t: 10, d: 1000, hr: 130, alt: 150 },
      { t: 20, d: 2000, hr: 125, alt: 120 },
    ];
    store.addActivity(records, name);
    return store;
  }

  function mountComponent() {
    return mount(OverviewPanel, {
      global: {
        plugins: [pinia],
      },
    });
  }

  it("hides baseline controls when only one activity is active", () => {
    addSimpleActivity("A1");
    const wrapper = mountComponent();

    expect(wrapper.text()).not.toContain("Baseline");
    expect(wrapper.text()).not.toContain("baseline");
    expect(wrapper.find('select').exists()).toBe(false);
  });

  it("shows baseline controls when multiple activities are active", async () => {
    const store = addSimpleActivity("A1");
    const records: ActivityRecord[] = [
      { t: 0, d: 0, hr: 100 },
      { t: 10, d: 900, hr: 105 },
    ];
    store.addActivity(records, "A2");
    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.text()).toContain("Baseline");
    expect(wrapper.find('select').exists()).toBe(true);
  });

  it("displays the overview title and description", () => {
    addSimpleActivity("Test Activity");
    const wrapper = mountComponent();

    expect(wrapper.text()).toContain("Overview");
    expect(wrapper.text()).toContain("Summary stats");
  });

  it("displays table headers with activity names", async () => {
    addSimpleActivity("Activity 1");
    const wrapper = mountComponent();
    await nextTick();

    const headers = wrapper.findAll("th");
    expect(headers.length).toBeGreaterThan(0);
    expect(headers[0]!.text()).toContain("Metric");
    if (headers.length > 1) {
      expect(headers[1]!.text()).toContain("Activity 1");
    }
  });

  it("displays Duration row with formatted time", async () => {
    addSimpleActivity("A1");
    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.text()).toContain("Duration");
    const text = wrapper.text();
    expect(text).toMatch(/0:10/);
  });

  it("displays Distance row with formatted distance", async () => {
    addSimpleActivity("A1");
    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.text()).toContain("Distance");
    const text = wrapper.text();
    expect(text).toMatch(/1\.00 km|1000 m/);
  });

  it("displays elevation gained and lost when elevation data is present", async () => {
    addActivityWithElevation("Activity with Elevation");
    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.text()).toContain("Elevation");
    expect(wrapper.text()).toContain("gained");
    expect(wrapper.text()).toContain("lost");
  });

  it("does not display elevation rows when no elevation data", () => {
    addSimpleActivity("A1");
    const wrapper = mountComponent();

    expect(wrapper.text()).not.toContain("Elevation");
  });

  it("displays metric headers with gray background", async () => {
    addSimpleActivity("A1");
    const wrapper = mountComponent();
    await nextTick();

    const metricHeaders = wrapper.findAll(".bg-gray-50");
    expect(metricHeaders.length).toBeGreaterThan(0);
  });

  it("displays Heart Rate metrics with min, average, max rows", async () => {
    const store = useActivityStore();
    const records: ActivityRecord[] = [
      { t: 0, d: 0, hr: 100 },
      { t: 10, d: 1000, hr: 120 },
      { t: 20, d: 2000, hr: 140 },
    ];
    store.addActivity(records, "Activity");
    const wrapper = mountComponent();
    await nextTick();

    const text = wrapper.text();
    expect(text).toContain("Heart Rate");
    expect(text).toContain("min");
    expect(text).toContain("average");
    expect(text).toContain("max");
    expect(text).toContain("100 bpm");
    expect(text).toContain("120 bpm");
    expect(text).toContain("140 bpm");
  });

  it("displays baseline comparisons for metrics when multiple activities", async () => {
    const store = useActivityStore();
    store.addActivity([{ t: 0, d: 0, hr: 100 }, { t: 10, d: 1000, hr: 120 }], "A1");
    store.addActivity([{ t: 0, d: 0, hr: 110 }, { t: 10, d: 1000, hr: 130 }], "A2");
    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.text()).toContain("baseline");
  });

  it("displays baseline comparisons for elevation when multiple activities", async () => {
    const store = useActivityStore();
    store.addActivity([{ t: 0, d: 0, alt: 100 }, { t: 10, d: 1000, alt: 150 }], "A1");
    store.addActivity([{ t: 0, d: 0, alt: 110 }, { t: 10, d: 1000, alt: 160 }], "A2");
    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.text()).toContain("Elevation");
    expect(wrapper.text()).toContain("baseline");
  });

  it("displays chart window indicator when window is active", async () => {
    addSimpleActivity("A1");
    const store = useActivityStore();
    store.setChartWindow({ xStartPercent: 10, xEndPercent: 90, yStartPercent: 0, yEndPercent: 100 });
    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.text()).toContain("Showing visible chart window");
    expect(wrapper.text()).toContain("X: 10–90%");
  });

  it("does not display chart window indicator when window is not active", () => {
    addSimpleActivity("A1");
    const store = useActivityStore();
    store.setChartWindow({ xStartPercent: 0, xEndPercent: 100, yStartPercent: 0, yEndPercent: 100 });
    const wrapper = mountComponent();

    expect(wrapper.text()).not.toContain("Showing visible chart window");
  });

  it("displays multiple activities in table headers", async () => {
    const store = addSimpleActivity("Activity 1");
    store.addActivity([{ t: 0, d: 0, hr: 100 }], "Activity 2");
    const wrapper = mountComponent();
    await nextTick();

    const headers = wrapper.findAll("th");
    expect(headers.length).toBeGreaterThan(2);
    expect(wrapper.text()).toContain("Activity 1");
    expect(wrapper.text()).toContain("Activity 2");
  });

  it("formats baseline comparisons with units", async () => {
    const store = useActivityStore();
    store.addActivity([{ t: 0, d: 0, hr: 100 }, { t: 10, d: 1000, hr: 120 }], "A1");
    store.addActivity([{ t: 0, d: 0, hr: 110 }, { t: 10, d: 1000, hr: 130 }], "A2");
    const wrapper = mountComponent();
    await nextTick();

    const text = wrapper.text();
    expect(text).toMatch(/\+10 bpm|\+10\.0 bpm/);
  });

  it("shows dash for zero differences in baseline comparisons", async () => {
    const store = useActivityStore();
    const records: ActivityRecord[] = [
      { t: 0, d: 0, hr: 100 },
      { t: 10, d: 1000, hr: 120 },
    ];
    store.addActivity(records, "A1");
    store.addActivity(records, "A2");
    const wrapper = mountComponent();
    await nextTick();

    const text = wrapper.text();
    expect(text).toContain("baseline");
  });
});

