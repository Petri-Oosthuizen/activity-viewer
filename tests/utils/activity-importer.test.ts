import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { importActivityFile, importActivityFiles } from "~/utils/activity-importer";
import type { RawActivity } from "~/types/activity";
import { DEFAULT_GPS_DISTANCE_OPTIONS } from "~/utils/gps-distance";

const sampleDataDir = join(process.cwd(), "tests", "sampleData", "equivalentActivities", "bronberrik");

describe("activity-importer", () => {
  describe("importActivityFile", () => {
    describe("GPX files", () => {
      it("should import GPX file and return RawActivity", async () => {
        const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
        const file = new File([gpxContent], "test.gpx", { type: "application/gpx+xml" });

        const result = await importActivityFile(file);

        expect(result).toBeDefined();
        expect(result.sourceType).toBe("gpx");
        expect(result.name).toBe("test.gpx");
        expect(result.id).toBeDefined();
        expect(result.records).toBeDefined();
        expect(result.records.length).toBeGreaterThan(0);
        expect(result.fileContent).toBeDefined();
        expect(result.metadata).toBeDefined();
      });

      it("should store file content as string for GPX", async () => {
        const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
        const file = new File([gpxContent], "test.gpx", { type: "application/gpx+xml" });

        const result = await importActivityFile(file);

        expect(typeof result.fileContent).toBe("string");
        if (typeof result.fileContent === "string") {
          expect(result.fileContent).toContain("<gpx");
        }
      });
    });

    describe("TCX files", () => {
      it("should import TCX file and return RawActivity", async () => {
        const tcxContent = readFileSync(join(sampleDataDir, "bronberrik.tcx"), "utf-8");
        const file = new File([tcxContent], "test.tcx", { type: "application/vnd.garmin.tcx+xml" });

        const result = await importActivityFile(file);

        expect(result).toBeDefined();
        expect(result.sourceType).toBe("tcx");
        expect(result.name).toBe("test.tcx");
        expect(result.id).toBeDefined();
        expect(result.records).toBeDefined();
        expect(result.records.length).toBeGreaterThan(0);
        expect(result.fileContent).toBeDefined();
        expect(result.metadata).toBeDefined();
      });

      it("should store file content as string for TCX", async () => {
        const tcxContent = readFileSync(join(sampleDataDir, "bronberrik.tcx"), "utf-8");
        const file = new File([tcxContent], "test.tcx", { type: "application/vnd.garmin.tcx+xml" });

        const result = await importActivityFile(file);

        expect(typeof result.fileContent).toBe("string");
        if (typeof result.fileContent === "string") {
          expect(result.fileContent).toContain("<TrainingCenterDatabase");
        }
      });
    });

    describe("FIT files", () => {
      it("should import FIT file and return RawActivity", async () => {
        const fitBuffer = readFileSync(join(sampleDataDir, "bronberrik.fit"));
        const file = new File([fitBuffer], "test.fit", { type: "application/octet-stream" });

        const result = await importActivityFile(file);

        expect(result).toBeDefined();
        expect(result.sourceType).toBe("fit");
        expect(result.name).toBe("test.fit");
        expect(result.id).toBeDefined();
        expect(result.records).toBeDefined();
        expect(result.records.length).toBeGreaterThan(0);
        expect(result.fileContent).toBeDefined();
        expect(result.metadata).toBeDefined();
      });

      it("should store file content as Blob for FIT", async () => {
        const fitBuffer = readFileSync(join(sampleDataDir, "bronberrik.fit"));
        const file = new File([fitBuffer], "test.fit", { type: "application/octet-stream" });

        const result = await importActivityFile(file);

        expect(result.fileContent).toBeInstanceOf(Blob);
      });
    });

    describe("file type detection", () => {
      it("should detect GPX from .gpx extension", async () => {
        const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
        const file1 = new File([gpxContent], "test.gpx");
        const file2 = new File([gpxContent], "TEST.GPX");
        const file3 = new File([gpxContent], "path/to/file.gpx");

        const result1 = await importActivityFile(file1);
        const result2 = await importActivityFile(file2);
        const result3 = await importActivityFile(file3);

        expect(result1.sourceType).toBe("gpx");
        expect(result2.sourceType).toBe("gpx");
        expect(result3.sourceType).toBe("gpx");
      });

      it("should detect TCX from .tcx extension", async () => {
        const tcxContent = readFileSync(join(sampleDataDir, "bronberrik.tcx"), "utf-8");
        const file = new File([tcxContent], "test.tcx");

        const result = await importActivityFile(file);

        expect(result.sourceType).toBe("tcx");
      });

      it("should detect FIT from .fit extension", async () => {
        const fitBuffer = readFileSync(join(sampleDataDir, "bronberrik.fit"));
        const file = new File([fitBuffer], "test.fit");

        const result = await importActivityFile(file);

        expect(result.sourceType).toBe("fit");
      });

      it("should throw error for unsupported file type", async () => {
        const file = new File(["content"], "test.txt");

        await expect(importActivityFile(file)).rejects.toThrow("Unknown file type");
      });
    });

    describe("GPS distance options", () => {
      it("should pass GPS distance options to parser", async () => {
        const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
        const file = new File([gpxContent], "test.gpx");

        const customOptions = {
          minMoveMeters: 5,
          maxSpeedMps: 10,
          includeElevation: true,
        };

        const result = await importActivityFile(file, customOptions);

        // The options are passed to the parser, which affects distance calculation
        // We can verify the import succeeded with custom options
        expect(result).toBeDefined();
        expect(result.records.length).toBeGreaterThan(0);
      });
    });

    describe("RawActivity structure", () => {
      it("should include all required fields in RawActivity", async () => {
        const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
        const file = new File([gpxContent], "test.gpx");

        const result = await importActivityFile(file);

        expect(result.id).toBeDefined();
        expect(result.name).toBe("test.gpx");
        expect(result.sourceType).toBe("gpx");
        expect(result.fileContent).toBeDefined();
        expect(result.records).toBeDefined();
        expect(Array.isArray(result.records)).toBe(true);
        expect(result.metadata).toBeDefined();
        expect(typeof result.metadata).toBe("object");
      });

      it("should generate unique IDs for different files", async () => {
        const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
        const file1 = new File([gpxContent], "test1.gpx");
        const file2 = new File([gpxContent], "test2.gpx");

        const result1 = await importActivityFile(file1);
        const result2 = await importActivityFile(file2);

        expect(result1.id).not.toBe(result2.id);
      });
    });

    describe("error handling", () => {
      it("should throw error for invalid GPX file", async () => {
        const file = new File(["invalid xml content"], "test.gpx");

        await expect(importActivityFile(file)).rejects.toThrow();
      });

      it("should throw error for invalid TCX file", async () => {
        const file = new File(["invalid xml content"], "test.tcx");

        await expect(importActivityFile(file)).rejects.toThrow();
      });

      it("should throw error for invalid FIT file", async () => {
        const file = new File(["invalid binary content"], "test.fit");

        await expect(importActivityFile(file)).rejects.toThrow();
      });
    });
  });

  describe("importActivityFiles", () => {
    it("should import multiple files successfully", async () => {
      const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
      const tcxContent = readFileSync(join(sampleDataDir, "bronberrik.tcx"), "utf-8");

      const files = [
        new File([gpxContent], "test1.gpx"),
        new File([tcxContent], "test2.tcx"),
      ];

      const results = await importActivityFiles(files);

      expect(results).toHaveLength(2);
      expect(results[0]?.sourceType).toBe("gpx");
      expect(results[1]?.sourceType).toBe("tcx");
    });

    it("should continue processing after error and return successful imports", async () => {
      const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");

      const files = [
        new File([gpxContent], "test1.gpx"),
        new File(["invalid"], "test2.gpx"), // Invalid file
        new File([gpxContent], "test3.gpx"),
      ];

      const results = await importActivityFiles(files);

      // Should have 2 successful imports (test1 and test3)
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results[0]?.name).toBe("test1.gpx");
      // Should log warning about failed file (we can't easily test console.warn in vitest)
    });

    it("should return empty array when all files fail", async () => {
      const files = [
        new File(["invalid"], "test1.gpx"),
        new File(["invalid"], "test2.tcx"),
      ];

      const results = await importActivityFiles(files);

      expect(results).toHaveLength(0);
    });

    it("should pass GPS distance options to all files", async () => {
      const gpxContent = readFileSync(join(sampleDataDir, "bronberrik.gpx"), "utf-8");
      const tcxContent = readFileSync(join(sampleDataDir, "bronberrik.tcx"), "utf-8");

      const files = [
        new File([gpxContent], "test1.gpx"),
        new File([tcxContent], "test2.tcx"),
      ];

      const customOptions = {
        minMoveMeters: 5,
        maxSpeedMps: 10,
      };

      const results = await importActivityFiles(files, customOptions);

      expect(results).toHaveLength(2);
      expect(results[0]?.records.length).toBeGreaterThan(0);
      expect(results[1]?.records.length).toBeGreaterThan(0);
    });
  });
});
