import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AxisTypeSelector from "~/components/AxisTypeSelector.vue";

describe("AxisTypeSelector", () => {
  it("emits the chosen axis", async () => {
    const wrapper = mount(AxisTypeSelector, { props: { value: "distance" } });
    await wrapper.find("button[title='Compare activities by clock time']").trigger("click");
    expect(wrapper.emitted("update:value")).toEqual([["localTime"]]);
  });
});
