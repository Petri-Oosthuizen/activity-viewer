import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import ActivityMap from "~/components/ActivityMap.vue";
import { useRawActivityStore } from "~/stores/rawActivity";
import type { RawActivity } from "~/types/activity";

describe("ActivityMap", () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  it("shows a fallback message when active activities do not include GPS points", () => {
    const rawStore = useRawActivityStore();
    const activity: RawActivity = {
      id: "indoor-1",
      name: "indoor-run.tcx",
      sourceType: "tcx",
      fileContent: "content",
      records: [
        { t: 0, d: 0, hr: 140 },
        { t: 60, d: 250, hr: 145 },
      ],
      metadata: {},
    };

    rawStore.addRawActivity(activity);

    const wrapper = mount(ActivityMap, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.text()).toContain("None of the active activities include GPS track points");
    expect(wrapper.text()).toContain("indoor or sensor-only files");
  });
});
