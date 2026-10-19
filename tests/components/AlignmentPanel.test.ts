import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { nextTick } from "vue";
import AlignmentPanel from "~/components/AlignmentPanel.vue";
import { useRawActivityStore } from "~/stores/rawActivity";
import { useActivitySettingsStore } from "~/stores/activitySettings";
import { useChartOptionsStore } from "~/stores/chartOptions";
import type { ActivityRecord, RawActivity } from "~/types/activity";

const ORIGIN_LAT = 51.5;
const ORIGIN_LON = -0.1;
const METRES_PER_DEG_LON = 111_320 * Math.cos((ORIGIN_LAT * Math.PI) / 180);

// Straight eastward track at 3 m/s, sampled every second.
function buildTrack({ timeShiftSeconds = 0, lonShift = 0 }: { timeShiftSeconds?: number; lonShift?: number }): ActivityRecord[] {
  const records: ActivityRecord[] = [];
  for (let t = 0; t <= 400; t++) {
    const d = 3 * t;
    records.push({ t: t + timeShiftSeconds, d, lat: ORIGIN_LAT, lon: ORIGIN_LON + lonShift + d / METRES_PER_DEG_LON });
  }
  return records;
}

function rawActivity({ id, records }: { id: string; records: ActivityRecord[] }): RawActivity {
  return { id, name: `${id}.gpx`, sourceType: "gpx", records, metadata: {} };
}

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll("button").find((b) => b.text() === text);
  if (!button) throw new Error(`button "${text}" not found`);
  return button;
}

describe("AlignmentPanel", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function pick(wrapper: ReturnType<typeof mount>, label: string) {
    return findButton(wrapper, label).trigger("click");
  }

  it("aligns other activities to the first by GPS and writes offsets", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    rawStore.addRawActivity(rawActivity({ id: "ref", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "late", records: buildTrack({ timeShiftSeconds: 37 }) }));

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    await pick(wrapper, "GPS");
    await nextTick();

    expect(settingsStore.alignmentMode).toBe("gps");
    expect(settingsStore.activityOffsets.get("late")).toBe(-37);
    expect(settingsStore.activityOffsets.get("ref")).toBe(0);
    expect(wrapper.text()).not.toContain("No GPS match");
  });

  it("lists activities without a GPS match in the status line", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    rawStore.addRawActivity(rawActivity({ id: "ref", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "far", records: buildTrack({ lonShift: 0.5 }) }));

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    await pick(wrapper, "GPS");
    await nextTick();

    expect(settingsStore.activityOffsets.get("far")).toBe(0);
    expect(wrapper.text()).toContain("No GPS match: far.gpx");
  });

  it("disables GPS when fewer than two enabled activities have GPS points", () => {
    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity({ id: "ref", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "hr", records: [{ t: 0, d: 0, hr: 120 }, { t: 1, d: 0, hr: 121 }] }));

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });

    expect(findButton(wrapper, "GPS").attributes("disabled")).toBeDefined();
  });

  it("uses the first activity with GPS as the reference", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    rawStore.addRawActivity(rawActivity({ id: "hr", records: [{ t: 0, d: 0, hr: 120 }, { t: 1, d: 0, hr: 121 }] }));
    rawStore.addRawActivity(rawActivity({ id: "ref", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "late", records: buildTrack({ timeShiftSeconds: 37 }) }));

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    await pick(wrapper, "GPS");
    await nextTick();

    expect(settingsStore.activityOffsets.get("late")).toBe(-37);
    expect(wrapper.text()).toContain("No GPS: hr.gpx");
  });

  it("none clears offsets and start alignment", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    rawStore.addRawActivity(rawActivity({ id: "a", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "b", records: buildTrack({}) }));
    settingsStore.setActivityOffset("a", 12);
    settingsStore.setActivityOffset("b", -4);

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    await pick(wrapper, "None");

    expect(settingsStore.alignmentMode).toBe("none");
    expect(settingsStore.activityOffsets.get("a")).toBe(0);
    expect(settingsStore.activityOffsets.get("b")).toBe(0);
  });

  it("start time switches to the local time axis", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    const chartOptionsStore = useChartOptionsStore();
    rawStore.addRawActivity(rawActivity({ id: "a", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "b", records: buildTrack({}) }));
    settingsStore.setAlignmentMode("none");
    chartOptionsStore.setXAxisType("distance");

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    await pick(wrapper, "Start time");

    expect(settingsStore.alignmentMode).toBe("startTime");
    expect(chartOptionsStore.xAxisType).toBe("localTime");
    expect(findButton(wrapper, "Start time").attributes("aria-pressed")).toBe("true");
  });
});
