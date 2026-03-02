import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import ActivityItem from "~/components/ActivityItem.vue";
import FileNameDisplay from "~/components/FileNameDisplay.vue";
import type { Activity } from "~/types/activity";

describe("ActivityItem", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("shows format, GPS availability, and metric capability summary", () => {
    const activity: Activity = {
      id: "a1",
      name: "tempo-run.tcx",
      sourceType: "tcx",
      offset: 0,
      scale: 1,
      color: "#000",
      records: [
        { t: 0, d: 0, lat: 1, lon: 2, hr: 140, pwr: 210, cad: 88, alt: 100 },
        { t: 10, d: 100, lat: 1.1, lon: 2.1, hr: 145, pwr: 220, cad: 90, alt: 103 },
      ],
      laps: [
        {
          startTime: new Date("2024-01-01T00:00:00Z"),
          startRecordIndex: 0,
          endRecordIndex: 1,
        },
      ],
    };

    const wrapper = mount(ActivityItem, {
      props: {
        activity,
      },
      global: {
        components: {
          FileNameDisplay,
        },
      },
    });

    const text = wrapper.text();
    expect(text).toContain("2 data points · TCX · GPS track · HR · Power · Cadence · Elevation · 1 lap");
  });
});
