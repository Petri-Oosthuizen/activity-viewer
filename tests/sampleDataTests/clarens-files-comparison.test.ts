import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseGPX } from "~/utils/gpx-parser";
import { parseTCX } from "~/utils/tcx-parser";
import { parseFIT } from "~/utils/fit-parser";
import { computeActivityStatsFromRecords } from "~/utils/activity-stats";

const sampleDataDir = join(process.cwd(), "tests", "sampleData");

function readSampleFile(filename: string): string {
  return readFileSync(join(sampleDataDir, filename), "utf-8");
}

function readSampleFileBinary(filename: string): ArrayBuffer {
  const buffer = readFileSync(join(sampleDataDir, filename));
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; i++) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

describe("clarens files comparison", () => {
  it("should produce equivalent stats for TCX and FIT formats (both use device-provided distance)", async () => {
    const tcxText = readSampleFile("clarens.tcx");
    const fitBuffer = readSampleFileBinary("clarens.fit");

    const tcxResult = parseTCX(tcxText);
    const fitResult = await parseFIT(fitBuffer);

    const tcxStats = computeActivityStatsFromRecords(tcxResult.records);
    const fitStats = computeActivityStatsFromRecords(fitResult.records);

    expect(tcxResult.records.length).toBeGreaterThan(0);
    expect(fitResult.records.length).toBeGreaterThan(0);

    expect(tcxStats.durationSeconds).toBeCloseTo(fitStats.durationSeconds, 1);
    expect(tcxStats.distanceMeters).toBeCloseTo(fitStats.distanceMeters, 1);

    if (tcxStats.elevationGainMeters !== null && fitStats.elevationGainMeters !== null) {
      const elevationDiff = Math.abs(tcxStats.elevationGainMeters - fitStats.elevationGainMeters);
      expect(elevationDiff).toBeLessThanOrEqual(2);
    }

    const metrics = ["hr", "pwr", "cad", "alt"] as const;
    for (const metric of metrics) {
      const tcxMetric = tcxStats.metrics[metric];
      const fitMetric = fitStats.metrics[metric];

      if (tcxMetric.avg !== null && fitMetric.avg !== null) {
        const avgDiff = Math.abs(tcxMetric.avg - fitMetric.avg);
        const avgTolerance = metric === "pwr" ? 5 : metric === "hr" ? 3 : 3;
        expect(avgDiff).toBeLessThanOrEqual(avgTolerance);
      }
      if (tcxMetric.min !== null && fitMetric.min !== null) {
        const minDiff = Math.abs(tcxMetric.min - fitMetric.min);
        const minTolerance = metric === "alt" ? 2 : 1;
        expect(minDiff).toBeLessThanOrEqual(minTolerance);
      }
      if (tcxMetric.max !== null && fitMetric.max !== null) {
        const maxDiff = Math.abs(tcxMetric.max - fitMetric.max);
        const maxTolerance = metric === "alt" ? 2 : 1;
        expect(maxDiff).toBeLessThanOrEqual(maxTolerance);
      }
      if (tcxMetric.count > 0 && fitMetric.count > 0) {
        const countRatio =
          Math.abs(tcxMetric.count - fitMetric.count) / Math.max(tcxMetric.count, fitMetric.count);
        expect(countRatio).toBeLessThan(0.1);
      }
    }
  });

  it("should produce equivalent stats for GPX, TCX, and FIT formats (GPX uses GPS-calculated distance)", async () => {
    const gpxText = readSampleFile("clarens.gpx");
    const tcxText = readSampleFile("clarens.tcx");
    const fitBuffer = readSampleFileBinary("clarens.fit");

    const gpxResult = parseGPX(gpxText);
    const tcxResult = parseTCX(tcxText);
    const fitResult = await parseFIT(fitBuffer);

    const gpxStats = computeActivityStatsFromRecords(gpxResult.records);
    const tcxStats = computeActivityStatsFromRecords(tcxResult.records);
    const fitStats = computeActivityStatsFromRecords(fitResult.records);

    expect(gpxResult.records.length).toBeGreaterThan(0);
    expect(tcxResult.records.length).toBeGreaterThan(0);
    expect(fitResult.records.length).toBeGreaterThan(0);

    expect(gpxStats.durationSeconds).toBeCloseTo(tcxStats.durationSeconds, 1);
    expect(gpxStats.durationSeconds).toBeCloseTo(fitStats.durationSeconds, 1);

    const tcxFitDistanceDiff = Math.abs(tcxStats.distanceMeters - fitStats.distanceMeters);
    expect(tcxFitDistanceDiff).toBeLessThanOrEqual(10);

    const gpxTcxDistanceDiff = Math.abs(gpxStats.distanceMeters - tcxStats.distanceMeters);
    const gpxFitDistanceDiff = Math.abs(gpxStats.distanceMeters - fitStats.distanceMeters);

    expect(gpxTcxDistanceDiff).toBeLessThanOrEqual(20);
    expect(gpxFitDistanceDiff).toBeLessThanOrEqual(20);

    if (gpxStats.elevationGainMeters !== null && tcxStats.elevationGainMeters !== null) {
      const elevationDiff = Math.abs(gpxStats.elevationGainMeters - tcxStats.elevationGainMeters);
      expect(elevationDiff).toBeLessThanOrEqual(5);
    }
    if (gpxStats.elevationGainMeters !== null && fitStats.elevationGainMeters !== null) {
      const elevationDiff = Math.abs(gpxStats.elevationGainMeters - fitStats.elevationGainMeters);
      expect(elevationDiff).toBeLessThanOrEqual(5);
    }

    const metrics = ["hr", "pwr", "cad", "alt"] as const;
    for (const metric of metrics) {
      const gpxMetric = gpxStats.metrics[metric];
      const tcxMetric = tcxStats.metrics[metric];
      const fitMetric = fitStats.metrics[metric];

      if (gpxMetric.avg !== null && tcxMetric.avg !== null) {
        const avgDiff = Math.abs(gpxMetric.avg - tcxMetric.avg);
        const avgTolerance = metric === "pwr" ? 5 : metric === "hr" ? 3 : 3;
        expect(avgDiff).toBeLessThanOrEqual(avgTolerance);
      }
      if (gpxMetric.avg !== null && fitMetric.avg !== null) {
        const avgDiff = Math.abs(gpxMetric.avg - fitMetric.avg);
        const avgTolerance = metric === "pwr" ? 5 : metric === "hr" ? 3 : 3;
        expect(avgDiff).toBeLessThanOrEqual(avgTolerance);
      }

      if (gpxMetric.min !== null && tcxMetric.min !== null) {
        const minDiff = Math.abs(gpxMetric.min - tcxMetric.min);
        const minTolerance = metric === "alt" ? 2 : 1;
        expect(minDiff).toBeLessThanOrEqual(minTolerance);
      }
      if (gpxMetric.min !== null && fitMetric.min !== null) {
        const minDiff = Math.abs(gpxMetric.min - fitMetric.min);
        const minTolerance = metric === "alt" ? 2 : 1;
        expect(minDiff).toBeLessThanOrEqual(minTolerance);
      }

      if (gpxMetric.max !== null && tcxMetric.max !== null) {
        const maxDiff = Math.abs(gpxMetric.max - tcxMetric.max);
        const maxTolerance = metric === "alt" ? 2 : 1;
        expect(maxDiff).toBeLessThanOrEqual(maxTolerance);
      }
      if (gpxMetric.max !== null && fitMetric.max !== null) {
        const maxDiff = Math.abs(gpxMetric.max - fitMetric.max);
        const maxTolerance = metric === "alt" ? 2 : 1;
        expect(maxDiff).toBeLessThanOrEqual(maxTolerance);
      }

      if (gpxMetric.count > 0 && tcxMetric.count > 0) {
        const gpxTcxCountRatio =
          Math.abs(gpxMetric.count - tcxMetric.count) / Math.max(gpxMetric.count, tcxMetric.count);
        expect(gpxTcxCountRatio).toBeLessThan(0.2);
      }
      if (gpxMetric.count > 0 && fitMetric.count > 0) {
        const gpxFitCountRatio =
          Math.abs(gpxMetric.count - fitMetric.count) / Math.max(gpxMetric.count, fitMetric.count);
        expect(gpxFitCountRatio).toBeLessThan(0.2);
      }
    }
  });

  it("should have similar record counts across formats", async () => {
    const gpxText = readSampleFile("clarens.gpx");
    const tcxText = readSampleFile("clarens.tcx");
    const fitBuffer = readSampleFileBinary("clarens.fit");

    const gpxResult = parseGPX(gpxText);
    const tcxResult = parseTCX(tcxText);
    const fitResult = await parseFIT(fitBuffer);

    const recordCountDiff = Math.abs(gpxResult.records.length - tcxResult.records.length);
    const recordCountRatio = recordCountDiff / Math.max(gpxResult.records.length, 1);

    expect(recordCountRatio).toBeLessThan(0.1);

    const fitRecordCountDiff = Math.abs(gpxResult.records.length - fitResult.records.length);
    const fitRecordCountRatio = fitRecordCountDiff / Math.max(gpxResult.records.length, 1);

    expect(fitRecordCountRatio).toBeLessThan(0.1);
  });

  it("should have matching start times within reasonable tolerance", async () => {
    const gpxText = readSampleFile("clarens.gpx");
    const tcxText = readSampleFile("clarens.tcx");
    const fitBuffer = readSampleFileBinary("clarens.fit");

    const gpxResult = parseGPX(gpxText);
    const tcxResult = parseTCX(tcxText);
    const fitResult = await parseFIT(fitBuffer);

    if (gpxResult.startTime && tcxResult.startTime) {
      const timeDiff = Math.abs(gpxResult.startTime.getTime() - tcxResult.startTime.getTime());
      expect(timeDiff).toBeLessThan(1000);
    }

    if (gpxResult.startTime && fitResult.startTime) {
      const timeDiff = Math.abs(gpxResult.startTime.getTime() - fitResult.startTime.getTime());
      expect(timeDiff).toBeLessThan(1000);
    }
  });
});
