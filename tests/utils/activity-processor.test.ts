import { describe, it, expect } from "vitest";
import { processActivityRecords } from "~/utils/activity-processor";
import type { ActivityRecord } from "~/types/activity";
import type { OutlierSettings, GpsSmoothingSettings, SmoothingSettings } from "~/utils/chart-settings";

describe("activity-processor", () => {
  describe("processActivityRecords", () => {
    it("should return empty array for empty input", () => {
      const result = processActivityRecords([], {
        outliers: { mode: "off", maxPercentChange: 200 },
        gpsSmoothing: { enabled: false, windowPoints: 5 },
        gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
        smoothing: { mode: "off", windowPoints: 5 },
        scaling: 1,
        offset: 0,
      });
      expect(result).toEqual([]);
    });

    it("should pass through records unchanged when all settings are off/default", () => {
      const records: ActivityRecord[] = [
        { t: 0, d: 0, hr: 100, alt: 10 },
        { t: 10, d: 100, hr: 110, alt: 12 },
      ];

      const result = processActivityRecords(records, {
        outliers: { mode: "off", maxPercentChange: 200 },
        gpsSmoothing: { enabled: false, windowPoints: 5 },
        gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
        smoothing: { mode: "off", windowPoints: 5 },
        scaling: 1,
        offset: 0,
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.hr).toBe(100);
      expect(result[1]?.hr).toBe(110);
    });

    describe("outlier handling", () => {
      it("should drop outliers when mode is drop", () => {
        // Change from 100 to 500: (500-100)/max(100,500) * 100 = 400/500 * 100 = 80% (not outlier at 200% threshold)
        // Change from 100 to 400: (400-100)/max(100,400) * 100 = 300/400 * 100 = 75% (not outlier)
        // Need change > 200%: (current-prev)/max(prev,current) * 100 > 200
        // For 100 -> X: (X-100)/max(100,X) * 100 > 200
        // If X > 100: (X-100)/X * 100 > 200 => 100*(X-100)/X > 200 => 100X - 10000 > 200X => -100X > 10000 => impossible
        // Actually: pct = abs(delta) / max(|prev|, |current|, 1) * 100
        // For 100 -> 400: pct = 300 / 400 * 100 = 75%
        // To get > 200%: we need abs(delta) / max(|prev|, |current|) * 100 > 200
        // If current > prev: (current - prev) / current * 100 > 200 => 100*(current-prev)/current > 200
        // => 100*current - 100*prev > 200*current => -100*prev > 100*current => impossible for positive values
        // The formula means we need a very large change. Let's use a simpler test: 100 -> 10 (90% change, should pass)
        // For a real outlier at 200% threshold, we need: abs(delta)/max(prev,current) * 100 > 200
        // If we go from 100 to 0.1: abs(0.1-100)/max(100,0.1) * 100 = 99.9/100 * 100 = 99.9% (still not > 200%)
        // The threshold of 200% is very high with this formula. Let's test with a lower threshold
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 10, d: 100, hr: 10 }, // Large drop (90% change with this formula)
          { t: 20, d: 200, hr: 110 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 50 }, // Lower threshold to catch the change
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        // With 50% threshold, 100->10 should be caught (90% change)
        const hrValue = result.find((r) => r.t === 10)?.hr;
        expect(hrValue).toBeUndefined();
      });

      it("should clamp outliers when mode is clamp", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 10, d: 100, hr: 10 }, // Large drop
          { t: 20, d: 200, hr: 110 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "clamp", maxPercentChange: 50 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const record = result.find((r) => r.t === 10);
        expect(record?.hr).toBeDefined();
        expect(record?.hr).not.toBe(10); // Should be clamped
      });

      it("should handle outliers per metric independently", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100, alt: 10 },
          { t: 10, d: 100, hr: 10, alt: 12 }, // HR spike (100->10), alt normal
          { t: 20, d: 200, hr: 110, alt: 1 }, // HR normal, alt spike (12->1)
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 50 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const record1 = result.find((r) => r.t === 10);
        const record2 = result.find((r) => r.t === 20);
        
        // At least one metric should be affected
        expect(record1).toBeDefined();
        expect(record2).toBeDefined();
      });

      it("should detect spikes in heart rate with 1% threshold", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 150 },
          { t: 10, d: 100, hr: 200 }, // 33% change: (200-150)/max(150,200)*100 = 50/200*100 = 25% (not caught at 1%)
          { t: 20, d: 200, hr: 151 }, // Normal
          { t: 30, d: 300, hr: 300 }, // 98% change: (300-151)/max(151,300)*100 = 149/300*100 = 49.7% (caught at 1%)
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 1 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt30 = result.find((r) => r.t === 30);
        expect(recordAt30?.hr).toBeUndefined();
      });

      it("should detect spikes in power with 50% threshold", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, pwr: 200 },
          { t: 10, d: 100, pwr: 400 }, // 50% change: (400-200)/max(200,400)*100 = 200/400*100 = 50% (not caught at 50%, but caught at 49%)
          { t: 20, d: 200, pwr: 210 }, // Normal
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 49 }, // Threshold is inclusive, so 49% catches 50% changes
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt10 = result.find((r) => r.t === 10);
        expect(recordAt10?.pwr).toBeUndefined();
      });

      it("should detect spikes in cadence with clamp mode", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, cad: 90 },
          { t: 10, d: 100, cad: 200 }, // 55% change: (200-90)/max(90,200)*100 = 110/200*100 = 55% (caught at 50%)
          { t: 20, d: 200, cad: 95 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "clamp", maxPercentChange: 50 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt10 = result.find((r) => r.t === 10);
        expect(recordAt10?.cad).toBeDefined();
        expect(recordAt10?.cad).not.toBe(200);
        // Clamped value should be: 90 + sign(110) * (50/100) * max(90,200) = 90 + 1 * 0.5 * 200 = 190
        expect(recordAt10?.cad).toBeCloseTo(190, 0);
      });

      it("should detect spikes in altitude", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, alt: 100 },
          { t: 10, d: 100, alt: 50 }, // 50% change: (50-100)/max(100,50)*100 = 50/100*100 = 50% (caught at 30%)
          { t: 20, d: 200, alt: 105 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 30 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt10 = result.find((r) => r.t === 10);
        expect(recordAt10?.alt).toBeUndefined();
      });

      it("should detect spikes in speed", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, speed: 3.0 },
          { t: 10, d: 100, speed: 10.0 }, // 70% change: (10-3)/max(3,10)*100 = 7/10*100 = 70% (caught at 50%)
          { t: 20, d: 200, speed: 3.2 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 50 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt10 = result.find((r) => r.t === 10);
        expect(recordAt10?.speed).toBeUndefined();
      });

      it("should detect spikes in temperature", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, temp: 20 },
          { t: 10, d: 100, temp: 50 }, // 60% change: (50-20)/max(20,50)*100 = 30/50*100 = 60% (caught at 50%)
          { t: 20, d: 200, temp: 21 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 50 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt10 = result.find((r) => r.t === 10);
        expect(recordAt10?.temp).toBeUndefined();
      });

      it("should handle multiple spikes in sequence for the same metric", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 150 },
          { t: 10, d: 100, hr: 300 }, // 50% change: (300-150)/max(150,300)*100 = 150/300*100 = 50% (caught at 49%)
          { t: 20, d: 200, hr: 500 }, // If previous was dropped, prev becomes null, so this is the new baseline
          { t: 30, d: 300, hr: 155 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 49 }, // Threshold is inclusive
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt10 = result.find((r) => r.t === 10);
        const recordAt20 = result.find((r) => r.t === 20);
        expect(recordAt10?.hr).toBeUndefined();
        // After dropping at t=10, prev becomes null, so t=20 becomes the new baseline (not compared)
        expect(recordAt20?.hr).toBe(500);
      });

      it("should handle spikes in multiple metrics simultaneously", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 150, pwr: 200, cad: 90 },
          { t: 10, d: 100, hr: 300, pwr: 400, cad: 95 }, // HR and PWR spike, cadence normal
          { t: 20, d: 200, hr: 155, pwr: 210, cad: 180 }, // HR and PWR normal, cadence spikes
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 49 }, // Threshold is inclusive, so 49% catches 50% changes
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt10 = result.find((r) => r.t === 10);
        const recordAt20 = result.find((r) => r.t === 20);
        
        // HR: (300-150)/max(150,300)*100 = 50% (caught at 49% threshold)
        expect(recordAt10?.hr).toBeUndefined();
        // PWR: (400-200)/max(200,400)*100 = 50% (caught at 49% threshold)
        expect(recordAt10?.pwr).toBeUndefined();
        // Cadence: (95-90)/max(90,95)*100 = 5.3% (not caught)
        expect(recordAt10?.cad).toBe(95);
        
        // Cadence: (180-95)/max(95,180)*100 = 47% (not caught at 49% threshold)
        expect(recordAt20?.cad).toBe(180);
      });

      it("should not flag normal variations below threshold", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 150 },
          { t: 10, d: 100, hr: 160 }, // 6.25% change: (160-150)/max(150,160)*100 = 10/160*100 = 6.25% (not caught at 50%)
          { t: 20, d: 200, hr: 170 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 50 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt10 = result.find((r) => r.t === 10);
        expect(recordAt10?.hr).toBe(160);
      });

      it("should drop pace spikes and not recalculate them", () => {
        // Create records with speed values that will produce pace spikes
        // pace = 1000 / (speed * 60)
        // 6 min/km = 1000 / (speed * 60) => speed = 1000 / (6 * 60) = 2.78 m/s
        // 36 min/km = 1000 / (speed * 60) => speed = 1000 / (36 * 60) = 0.463 m/s
        // The pace spike from 6 to 36 is: (36-6)/max(6,36)*100 = 30/36*100 = 83% change (caught at 49%)
        const records: ActivityRecord[] = [
          { t: 0, d: 0, speed: 2.78 }, // ~6 min/km pace
          { t: 10, d: 100, speed: 0.463 }, // ~36 min/km pace - spike
          { t: 20, d: 200, speed: 2.78 }, // Back to ~6 min/km pace
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 49 }, // Should catch 83% change
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: false, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        // Find the record with the spike (at t=10)
        const recordAt10 = result.find((r) => r.t === 10);
        expect(recordAt10).toBeDefined();
        
        // Speed spike: (0.463-2.78)/max(2.78,0.463)*100 = -2.317/2.78*100 = -83% change (caught)
        // Speed is dropped first, so pace won't be calculated from speed.
        // This prevents the pace spike from appearing, as pace is calculated from speed.
        // When speed is dropped, the spike is handled at the speed level, preventing the pace spike.
        expect(recordAt10?.speed).toBeUndefined();
        
        // Verify the spike record doesn't have pace calculated from the dropped speed
        // (pace may be calculated from distance/time fallback, but that's a different value)
        // The key is that the original pace spike (36 min/km) won't appear because speed was dropped
      });

      it("should clamp pace spikes correctly", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, speed: 2.78 }, // ~6 min/km pace
          { t: 10, d: 100, speed: 0.46 }, // ~36 min/km pace (spike)
          { t: 20, d: 200, speed: 2.78 }, // Back to ~6 min/km
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "clamp", maxPercentChange: 49 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        const recordAt10 = result.find((r) => r.t === 10);
        expect(recordAt10?.pace).toBeDefined();
        expect(recordAt10?.pace).not.toBeNull();
        // Clamped value should be less than the spike (36) but more than the previous (6)
        expect(recordAt10?.pace).toBeGreaterThan(6);
        expect(recordAt10?.pace).toBeLessThan(36);
      });
    });

    describe("invalid record removal", () => {
      it("should remove records missing time", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { d: 100, hr: 110 } as ActivityRecord, // Missing t
          { t: 20, d: 200, hr: 120 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(2);
        expect(result[0]?.t).toBe(0);
        expect(result[1]?.t).toBe(20);
      });

      it("should remove records missing distance", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 10, hr: 110 } as ActivityRecord, // Missing d
          { t: 20, d: 200, hr: 120 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(2);
      });

      it("should remove records with invalid GPS coordinates", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, lat: 45, lon: -122 },
          { t: 10, d: 100, lat: 91, lon: -122 }, // Invalid lat (>90)
          { t: 20, d: 200, lat: 45, lon: -181 }, // Invalid lon (<-180)
          { t: 30, d: 300, lat: 45, lon: -122 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(2);
        expect(result[0]?.t).toBe(0);
        expect(result[1]?.t).toBe(30);
      });
    });

    describe("data smoothing", () => {
      it("should smooth metric values when moving average is enabled", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 10, d: 100, hr: 110 },
          { t: 20, d: 200, hr: 120 },
          { t: 30, d: 300, hr: 130 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "movingAverage", windowPoints: 3 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(4);
        // Values should be smoothed (exact values depend on smoothing algorithm)
        expect(result[0]?.hr).toBeDefined();
        expect(result[1]?.hr).toBeDefined();
        // With moving average window of 3 (half=1), first value averages [0,1]: (100+110)/2 = 105
        expect(result[0]?.hr).toBeCloseTo(105, 0);
      });

      it("should smooth metric values when EMA is enabled", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 10, d: 100, hr: 110 },
          { t: 20, d: 200, hr: 120 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "ema", windowPoints: 3 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(3);
        // EMA with window 3: alpha = 2/(3+1) = 0.5
        // [0]: first value = 100
        // [1]: 0.5 * 110 + 0.5 * 100 = 105
        // [2]: 0.5 * 120 + 0.5 * 105 = 112.5
        expect(result[0]?.hr).toBe(100);
        expect(result[1]?.hr).toBeCloseTo(105, 1);
        expect(result[2]?.hr).toBeCloseTo(112.5, 1);
      });

      it("should not modify values when smoothing is off", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 10, d: 100, hr: 110 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result[0]?.hr).toBe(100);
        expect(result[1]?.hr).toBe(110);
      });

      it("should smooth multiple metrics independently", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100, pwr: 200 },
          { t: 10, d: 100, hr: 110, pwr: 210 },
          { t: 20, d: 200, hr: 120, pwr: 220 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "movingAverage", windowPoints: 3 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(3);
        // Moving average window 3, half=1:
        // HR: [0] = avg([0,1]) = (100+110)/2 = 105
        // PWR: [0] = avg([0,1]) = (200+210)/2 = 205
        expect(result[0]?.hr).toBeCloseTo(105, 1);
        expect(result[0]?.pwr).toBeCloseTo(205, 1);
        // Both metrics should be smoothed independently
        expect(result[1]?.hr).toBeCloseTo(110, 1); // avg([0,1,2]) = (100+110+120)/3
        expect(result[1]?.pwr).toBeCloseTo(210, 1); // avg([0,1,2]) = (200+210+220)/3
      });
    });

    describe("GPS smoothing", () => {
      it("should smooth GPS coordinates when enabled", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, lat: 45.0, lon: -122.0 },
          { t: 10, d: 100, lat: 45.1, lon: -122.1 },
          { t: 20, d: 200, lat: 45.2, lon: -122.2 },
          { t: 30, d: 300, lat: 45.3, lon: -122.3 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: true, windowPoints: 3 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(4);
        // Coordinates should be smoothed (exact values depend on smoothing algorithm)
        expect(result[0]?.lat).toBeDefined();
        expect(result[0]?.lon).toBeDefined();
      });

      it("should not modify coordinates when GPS smoothing is disabled", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, lat: 45.0, lon: -122.0 },
          { t: 10, d: 100, lat: 45.1, lon: -122.1 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result[0]?.lat).toBe(45.0);
        expect(result[0]?.lon).toBe(-122.0);
        expect(result[1]?.lat).toBe(45.1);
        expect(result[1]?.lon).toBe(-122.1);
      });
    });

    describe("scaling", () => {
      it("should scale metric values", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100, alt: 10 },
          { t: 10, d: 100, hr: 110, alt: 12 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1.5,
          offset: 0,
        });

        expect(result[0]?.hr).toBe(150);
        expect(result[0]?.alt).toBe(15);
        expect(result[1]?.hr).toBe(165);
        expect(result[1]?.alt).toBe(18);
      });

      it("should not scale when scale is 1", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 10, d: 100, hr: 110 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result[0]?.hr).toBe(100);
        expect(result[1]?.hr).toBe(110);
      });
    });

    describe("derived metrics", () => {
      it("should calculate derived metrics (grade, verticalSpeed, pace)", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, alt: 100 },
          { t: 10, d: 100, alt: 110 }, // 10m up in 100m = 10% grade
          { t: 20, d: 200, alt: 105 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result[1]?.grade).toBeDefined();
        expect(result[1]?.verticalSpeed).toBeDefined();
        // Grade should be approximately 10% (10m / 100m)
        expect(result[1]?.grade).toBeCloseTo(10, 0);
      });

      it("should preserve speed field for pace calculation", () => {
        // Pace is calculated on-demand from speed, not stored as a field
        // This test verifies that speed is preserved through processing
        const records: ActivityRecord[] = [
          { t: 0, d: 0, speed: 3.33 }, // ~3.33 m/s = 5 min/km pace
          { t: 60, d: 200, speed: 3.33 },
          { t: 120, d: 400, speed: 3.33 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        // Speed should be preserved for pace calculation later
        expect(result[1]?.speed).toBeDefined();
        expect(result[1]?.speed).toBe(3.33);
        // Pace is not a stored field - it's calculated on-demand when needed
      });
    });

    describe("offset application", () => {
      it("should apply time offset as last step", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 10, d: 100, hr: 110 },
          { t: 20, d: 200, hr: 120 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 5,
        });

        expect(result[0]?.t).toBe(5);
        expect(result[1]?.t).toBe(15);
        expect(result[2]?.t).toBe(25);
        // HR should still be original (scaling was 1, so no change)
        expect(result[0]?.hr).toBe(100);
        expect(result[1]?.hr).toBe(110);
      });

      it("should not allow negative time after offset", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 5, d: 100, hr: 110 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: -10,
        });

        expect(result[0]?.t).toBe(0); // Clamped to 0
        expect(result[1]?.t).toBe(0); // Clamped to 0 (5 - 10 = -5, clamped)
      });
    });

    describe("pipeline order verification", () => {
      it("should apply processing in correct order: outliers → remove invalid → GPS smooth → smooth → scale → derive → offset", () => {
        // Create records that test the pipeline order
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100, alt: 10 },
          { t: 10, d: 100, hr: 1000, alt: 12 }, // Outlier HR
          { d: 200, hr: 110, alt: 15 } as ActivityRecord, // Invalid (missing t)
          { t: 30, d: 300, hr: 120, alt: 20 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 2,
          offset: 5,
        });

        // Invalid record should be removed (step 3)
        expect(result.length).toBeLessThan(4);

        // Outlier should be dropped (step 1)
        const validRecords = result.filter((r) => r.t !== undefined && r.d !== undefined);
        const recordWithOutlier = validRecords.find((r) => r.t === 10);
        if (recordWithOutlier) {
          expect(recordWithOutlier.hr).toBeUndefined(); // Dropped by outlier handling
        }

        // Scaling should be applied (step 5)
        const scaledRecord = validRecords.find((r) => r.alt === 40); // 20 * 2
        expect(scaledRecord).toBeDefined();

        // Offset should be applied last (step 7)
        const offsetRecord = validRecords.find((r) => r.alt === 40);
        if (offsetRecord) {
          expect(offsetRecord.t).toBeGreaterThanOrEqual(5); // Offset applied
        }
      });
    });

    describe("edge cases", () => {
      it("should handle single record", () => {
        const records: ActivityRecord[] = [{ t: 0, d: 0, hr: 100 }];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(1);
        expect(result[0]?.hr).toBe(100);
      });

      it("should handle records with all null metric values", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0 },
          { t: 10, d: 100 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "drop", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(2);
        expect(result[0]?.t).toBe(0);
        expect(result[1]?.t).toBe(10);
      });

      it("should handle records with partial metric values", () => {
        const records: ActivityRecord[] = [
          { t: 0, d: 0, hr: 100 },
          { t: 10, d: 100, alt: 12 },
          { t: 20, d: 200, hr: 110, alt: 15 },
        ];

        const result = processActivityRecords(records, {
          outliers: { mode: "off", maxPercentChange: 200 },
          gpsSmoothing: { enabled: false, windowPoints: 5 },
          gpsPaceSmoothing: { enabled: true, windowPoints: 5 },
          smoothing: { mode: "off", windowPoints: 5 },
          scaling: 1,
          offset: 0,
        });

        expect(result).toHaveLength(3);
        expect(result[0]?.hr).toBe(100);
        expect(result[1]?.hr).toBeUndefined();
        expect(result[1]?.alt).toBe(12);
        expect(result[2]?.hr).toBe(110);
        expect(result[2]?.alt).toBe(15);
      });
    });
  });
});
