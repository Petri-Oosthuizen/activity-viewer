import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AxisTypeSelector from "~/components/AxisTypeSelector.vue";

describe("AxisTypeSelector", () => {
  it("shows the align start times toggle only on the local time axis", async () => {
    const wrapper = mount(AxisTypeSelector, { props: { value: "distance", alignStarts: true } });
    expect(wrapper.find("input[type=checkbox]").exists()).toBe(false);

    await wrapper.setProps({ value: "localTime" });
    const toggle = wrapper.find("input[type=checkbox]");
    expect(toggle.exists()).toBe(true);
    expect((toggle.element as HTMLInputElement).checked).toBe(true);

    await toggle.setValue(false);
    expect(wrapper.emitted("update:alignStarts")).toEqual([[false]]);
  });

  it("emits the chosen axis", async () => {
    const wrapper = mount(AxisTypeSelector, { props: { value: "distance", alignStarts: true } });
    await wrapper.find("button[title='Compare activities by clock time']").trigger("click");
    expect(wrapper.emitted("update:value")).toEqual([["localTime"]]);
  });
});
