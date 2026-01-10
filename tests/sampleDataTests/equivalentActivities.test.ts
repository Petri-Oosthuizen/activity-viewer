import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { parseGPX } from "~/utils/gpx-parser";
import { parseTCX } from "~/utils/tcx-parser";
import { parseFIT } from "~/utils/fit-parser";
import { computeActivityStatsFromRecords } from "~/utils/activity-stats";
import type { ParseResult } from "~/types/activity";

const equivalentActivitiesDir = join(process.cwd(), "tests", "sampleData", "equivalentActivities");

interface ParsedActivity {
  format: "gpx" | "tcx" | "fit";
  name: string;
  result: ParseResult;
  stats: ReturnType<typeof computeActivityStatsFromRecords>;
}

function readSampleFile(filename: string): string {
  return readFileSync(filename, "utf-8");
}

function readSampleFileBinary(filename: string): ArrayBuffer {
  const buffer = readFileSync(filename);
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; i++) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

async function parseActivityFile(
  filepath: string,
  format: "gpx" | "tcx" | "fit",
): Promise<ParseResult> {
  if (format === "gpx") {
    const text = readSampleFile(filepath);
    return parseGPX(text);
  } else if (format === "tcx") {
    const text = readSampleFile(filepath);
    return parseTCX(text);
  } else if (format === "fit") {
    const buffer = readSampleFileBinary(filepath);
    return await parseFIT(buffer);
  }
  throw new Error(`Unknown format: ${format}`);
}

function detectFileFormat(filename: string): "gpx" | "tcx" | "fit" | null {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "gpx") return "gpx";
  if (ext === "tcx") return "tcx";
  if (ext === "fit") return "fit";
  return null;
}

function getActivityFolders(): string[] {
  const entries = readdirSync(equivalentActivitiesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(equivalentActivitiesDir, entry.name));
}

function getActivityFiles(
  folderPath: string,
): Array<{ filepath: string; format: "gpx" | "tcx" | "fit" }> {
  const entries = readdirSync(folderPath, { withFileTypes: true });
  const files: Array<{ filepath: string; format: "gpx" | "tcx" | "fit" }> = [];

  for (const entry of entries) {
    if (entry.isFile()) {
      const format = detectFileFormat(entry.name);
      if (format) {
        files.push({ filepath: join(folderPath, entry.name), format });
      }
    }
  }

  return files;
}

async function loadActivitiesFromFolder(folderPath: string): Promise<ParsedActivity[]> {
  const files = getActivityFiles(folderPath);
  const activities: ParsedActivity[] = [];

  for (const file of files) {
    try {
      const result = await parseActivityFile(file.filepath, file.format);
      const stats = computeActivityStatsFromRecords(result.records);
      activities.push({
        format: file.format,
        name: file.filepath.split("/").pop() || file.filepath,
        result,
        stats,
      });
    } catch (error) {
      throw new Error(`Failed to parse ${file.filepath}: ${error}`);
    }
  }

  return activities;
}

function compareStats(
  a: ParsedActivity,
  b: ParsedActivity,
  options: {
    allowGpsDistanceDiff?: boolean;
  } = {},
): void {
  const { allowGpsDistanceDiff = false } = options;

  expect(a.result.records.length).toBeGreaterThan(0);
  expect(b.result.records.length).toBeGreaterThan(0);

  const durationDiff = Math.abs(a.stats.durationSeconds - b.stats.durationSeconds);
  expect(durationDiff).toBeLessThanOrEqual(2);

  if (allowGpsDistanceDiff) {
    const distanceDiff = Math.abs(a.stats.distanceMeters - b.stats.distanceMeters);
    expect(distanceDiff).toBeLessThanOrEqual(20);
  } else {
    const distanceDiff = Math.abs(a.stats.distanceMeters - b.stats.distanceMeters);
    expect(distanceDiff).toBeLessThanOrEqual(10);
  }

  if (a.stats.elevationGainMeters !== null && b.stats.elevationGainMeters !== null) {
    const elevationDiff = Math.abs(a.stats.elevationGainMeters - b.stats.elevationGainMeters);
    expect(elevationDiff).toBeLessThanOrEqual(5);
  }

  const metrics = ["hr", "pwr", "cad", "alt"] as const;
  for (const metric of metrics) {
    const aMetric = a.stats.metrics[metric];
    const bMetric = b.stats.metrics[metric];

    if (aMetric.avg !== null && bMetric.avg !== null) {
      const avgDiff = Math.abs(aMetric.avg - bMetric.avg);
      const avgTolerance = metric === "pwr" ? 5 : metric === "hr" ? 3 : 3;
      expect(avgDiff).toBeLessThanOrEqual(avgTolerance);
    }
    if (aMetric.min !== null && bMetric.min !== null) {
      const minDiff = Math.abs(aMetric.min - bMetric.min);
      const minTolerance = metric === "alt" ? 2 : 1;
      expect(minDiff).toBeLessThanOrEqual(minTolerance);
    }
    if (aMetric.max !== null && bMetric.max !== null) {
      const maxDiff = Math.abs(aMetric.max - bMetric.max);
      const maxTolerance = metric === "alt" ? 2 : 1;
      expect(maxDiff).toBeLessThanOrEqual(maxTolerance);
    }
    if (aMetric.count > 0 && bMetric.count > 0) {
      const countRatio =
        Math.abs(aMetric.count - bMetric.count) / Math.max(aMetric.count, bMetric.count);
      expect(countRatio).toBeLessThan(0.2);
    }
  }
}

function compareRecordCounts(activities: ParsedActivity[]): void {
  if (activities.length < 2) return;

  const recordCounts = activities.map((a) => a.result.records.length);
  const maxCount = Math.max(...recordCounts);
  const minCount = Math.min(...recordCounts);

  const countRatio = (maxCount - minCount) / maxCount;
  expect(countRatio).toBeLessThan(0.1);
}

function compareStartTimes(activities: ParsedActivity[]): void {
  const startTimes = activities.filter((a) => a.result.startTime).map((a) => a.result.startTime!);

  if (startTimes.length < 2) return;

  for (let i = 1; i < startTimes.length; i++) {
    const timeDiff = Math.abs(startTimes[0]!.getTime() - startTimes[i]!.getTime());
    expect(timeDiff).toBeLessThan(1000);
  }
}

const activityFolders = getActivityFolders();

if (activityFolders.length === 0) {
  describe("equivalent activities", () => {
    it("should have at least one activity folder", () => {
      expect(activityFolders.length).toBeGreaterThan(0);
    });
  });
} else {
  for (const folderPath of activityFolders) {
    const folderName = folderPath.split("/").pop() || folderPath;

    describe(`${folderName} files comparison`, () => {
      let activities: ParsedActivity[];

      beforeAll(async () => {
        activities = await loadActivitiesFromFolder(folderPath);
        expect(activities.length).toBeGreaterThanOrEqual(2);
      });

      it("should produce equivalent stats across all formats", () => {
        const hasGpx = activities.some((a) => a.format === "gpx");
        const hasTcx = activities.some((a) => a.format === "tcx");
        const hasFit = activities.some((a) => a.format === "fit");

        for (let i = 0; i < activities.length; i++) {
          for (let j = i + 1; j < activities.length; j++) {
            const a = activities[i]!;
            const b = activities[j]!;

            const allowGpsDistanceDiff =
              hasGpx && (a.format === "gpx" || b.format === "gpx") && (hasTcx || hasFit);

            compareStats(a, b, { allowGpsDistanceDiff });
          }
        }
      });

      it("should have similar record counts across formats", () => {
        compareRecordCounts(activities);
      });

      it("should have matching start times within reasonable tolerance", () => {
        compareStartTimes(activities);
      });
    });
  }
}
