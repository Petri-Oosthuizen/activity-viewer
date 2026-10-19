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

  it("aligns other activities to the first by GPS and writes offsets", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    rawStore.addRawActivity(rawActivity({ id: "ref", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "late", records: buildTrack({ timeShiftSeconds: 37 }) }));

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    await findButton(wrapper, "Align by GPS").trigger("click");
    await nextTick();

    expect(settingsStore.activityOffsets.get("late")).toBe(-37);
    expect(settingsStore.activityOffsets.has("ref")).toBe(false);
    expect(wrapper.text()).not.toContain("No GPS match");
  });

  it("lists activities without a GPS match in the status line", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    rawStore.addRawActivity(rawActivity({ id: "ref", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "elsewhere", records: buildTrack({ lonShift: 1 }) }));

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    await findButton(wrapper, "Align by GPS").trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("No GPS match: elsewhere.gpx");
    expect(settingsStore.activityOffsets.has("elsewhere")).toBe(false);
  });

  it("uses the first activity with GPS as the reference when the first has none", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    rawStore.addRawActivity(rawActivity({ id: "indoor", records: [{ t: 0, d: 0, hr: 120 }, { t: 1, d: 3, hr: 121 }] }));
    rawStore.addRawActivity(rawActivity({ id: "ref", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "late", records: buildTrack({ timeShiftSeconds: 37 }) }));

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    await findButton(wrapper, "Align by GPS").trigger("click");
    await nextTick();

    expect(settingsStore.activityOffsets.get("late")).toBe(-37);
    expect(settingsStore.activityOffsets.has("ref")).toBe(false);
    expect(settingsStore.activityOffsets.has("indoor")).toBe(false);
    expect(wrapper.text()).toContain("No GPS: indoor.gpx");
    expect(wrapper.text()).not.toContain("No GPS match");
  });

  it("disables GPS alignment when fewer than two activities have GPS points", async () => {
    const rawStore = useRawActivityStore();
    rawStore.addRawActivity(rawActivity({ id: "ref", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "indoor", records: [{ t: 0, d: 0, hr: 120 }, { t: 1, d: 3, hr: 121 }] }));

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });

    expect(findButton(wrapper, "Align by GPS").attributes("disabled")).toBeDefined();
  });

  it("resets every offset to zero", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    rawStore.addRawActivity(rawActivity({ id: "a", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "b", records: buildTrack({}) }));
    settingsStore.setActivityOffset("a", 12);
    settingsStore.setActivityOffset("b", -30);

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    await findButton(wrapper, "Reset offsets").trigger("click");

    expect(settingsStore.activityOffsets.get("a")).toBe(0);
    expect(settingsStore.activityOffsets.get("b")).toBe(0);
  });

  it("shows the align start times toggle only on the local time axis", async () => {
    const rawStore = useRawActivityStore();
    const settingsStore = useActivitySettingsStore();
    const chartOptionsStore = useChartOptionsStore();
    rawStore.addRawActivity(rawActivity({ id: "a", records: buildTrack({}) }));
    rawStore.addRawActivity(rawActivity({ id: "b", records: buildTrack({}) }));

    const wrapper = mount(AlignmentPanel, { global: { plugins: [pinia] } });
    expect(wrapper.find("input[type=checkbox]").exists()).toBe(false);

    chartOptionsStore.setXAxisType("localTime");
    await nextTick();
    const toggle = wrapper.find("input[type=checkbox]");
    expect(toggle.exists()).toBe(true);
    expect((toggle.element as HTMLInputElement).checked).toBe(true);

    await toggle.setValue(false);
    expect(settingsStore.alignStarts).toBe(false);
  });
});
