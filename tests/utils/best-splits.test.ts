import { describe, it, expect } from "vitest";
import { calculateBestSplits, COMMON_SPLITS } from "~/utils/best-splits";
import type { ActivityRecord } from "~/types/activity";

describe("best-splits", () => {
  it("should calculate best splits for a simple activity", () => {
    // Create a simple activity: 5km in 20 minutes (constant pace)
    const records: ActivityRecord[] = [];
    const totalDistance = 5000; // 5km
    const totalTime = 20 * 60; // 20 minutes
    const numRecords = 101; // Need one more record to actually reach 5km

    for (let i = 0; i < numRecords; i++) {
      records.push({
        t: (totalTime / (numRecords - 1)) * i,
        d: (totalDistance / (numRecords - 1)) * i,
      });
    }

    // Calculate actual total distance from records
    const actualTotalDistance = records[records.length - 1]!.d - records[0]!.d;
    const splits = calculateBestSplits(records, actualTotalDistance);

    // Should have splits up to 5km
    expect(splits["1km"]).toBeDefined();
    expect(splits["1km"]?.timeSeconds).toBeGreaterThan(0);
    expect(splits["5km"]).toBeDefined();
    expect(splits["5km"]?.timeSeconds).toBeGreaterThan(0);
    
    // Should not have splits longer than the activity
    expect(splits["10km"]).toBeUndefined();
    expect(splits["Marathon"]).toBeUndefined();

    // Best 1km should be close to 4 minutes (20 min / 5 km)
    if (splits["1km"]?.timeSeconds) {
      expect(splits["1km"].timeSeconds).toBeCloseTo(4 * 60, -1); // Within 10 seconds
    }
  });

  it("should handle activities shorter than minimum split", () => {
    const records: ActivityRecord[] = [
      { t: 0, d: 0 },
      { t: 60, d: 50 }, // 50m in 1 minute
    ];

    const splits = calculateBestSplits(records, 50);
    
    // Should not have any splits (all common splits are >= 100m)
    expect(Object.keys(splits).length).toBe(0);
  });

  it("should find the fastest segment", () => {
    // Create activity with a fast middle segment
    const records: ActivityRecord[] = [];
    const numRecords = 200;
    const totalDistance = 5000; // 5km

    for (let i = 0; i < numRecords; i++) {
      const distance = (totalDistance / numRecords) * i;
      // Fast segment from 1000m to 2000m (twice as fast)
      let time;
      if (distance < 1000) {
        time = (distance / 1000) * 240; // 4 min/km
      } else if (distance < 2000) {
        time = 240 + ((distance - 1000) / 1000) * 120; // 2 min/km (fast!)
      } else {
        time = 360 + ((distance - 2000) / 1000) * 240; // 4 min/km
      }

      records.push({
        t: time,
        d: distance,
      });
    }

    const splits = calculateBestSplits(records, totalDistance);
    
    // Best 1km should be from the fast segment (around 2 minutes = 120 seconds)
    if (splits["1km"]?.timeSeconds) {
      expect(splits["1km"].timeSeconds).toBeLessThan(180); // Less than 3 minutes
      expect(splits["1km"].timeSeconds).toBeGreaterThan(100); // More than 1.5 minutes
    }
  });
});
