import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import OverviewPanel from "~/components/OverviewPanel.vue";
import { useActivityStore } from "~/stores/activity";
import type { ActivityRecord } from "~/types/activity";

describe("OverviewPanel", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
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

  it("hides baseline controls when only one activity is active", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = addSimpleActivity("A1");

    const wrapper = mount(OverviewPanel, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.text()).not.toContain("Baseline");
    expect(wrapper.text()).not.toContain("baseline");
  });

  it("shows baseline controls when multiple activities are active", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = addSimpleActivity("A1");
    const records: ActivityRecord[] = [
      { t: 0, d: 0, hr: 100 },
      { t: 10, d: 900, hr: 105 },
    ];
    store.addActivity(records, "A2");

    const wrapper = mount(OverviewPanel, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.text()).toContain("Baseline");
  });
});

