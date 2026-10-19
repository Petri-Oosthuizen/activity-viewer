import { describe, it, expect } from "vitest";
import { getActivityXValues } from "~/utils/activity-xvalues";
import type { Activity } from "~/types/activity";

describe("getActivityXValues", () => {
  const startTime = new Date("2024-01-02T10:00:00Z");
  const base: Activity = {
    id: "xvalues-1",
    name: "Test",
    records: [
      { t: 0, d: 0 },
      { t: 10, d: 100 },
    ],
    color: "#5470c6",
    offset: 0,
    scale: 1,
    startTime,
  };

  it("should recompute localTime values when timelineStart changes", () => {
    const first = getActivityXValues(base, "localTime");
    expect(first.values).toEqual([startTime.getTime(), startTime.getTime() + 10000]);

    const timelineStart = new Date("2024-01-01T10:00:00Z");
    const aligned = getActivityXValues({ ...base, timelineStart }, "localTime");

    expect(aligned.values).toEqual([timelineStart.getTime(), timelineStart.getTime() + 10000]);
  });
});
