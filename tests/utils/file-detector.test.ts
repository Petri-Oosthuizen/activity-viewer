import { describe, it, expect } from "vitest";
import { detectFileType, isSupportedFileType } from "~/utils/file-detector";

describe("file-detector", () => {
  describe("detectFileType", () => {
    it("should detect GPX from .gpx extension", () => {
      expect(detectFileType(new File([], "test.gpx"))).toBe("gpx");
      expect(detectFileType(new File([], "TEST.GPX"))).toBe("gpx");
      expect(detectFileType(new File([], "path/to/file.gpx"))).toBe("gpx");
    });

    it("should detect TCX from .tcx extension", () => {
      expect(detectFileType(new File([], "test.tcx"))).toBe("tcx");
      expect(detectFileType(new File([], "TEST.TCX"))).toBe("tcx");
      expect(detectFileType(new File([], "path/to/file.tcx"))).toBe("tcx");
    });

    it("should detect FIT from .fit extension", () => {
      expect(detectFileType(new File([], "test.fit"))).toBe("fit");
      expect(detectFileType(new File([], "TEST.FIT"))).toBe("fit");
      expect(detectFileType(new File([], "path/to/file.fit"))).toBe("fit");
    });

    it("should return unknown for unsupported extensions", () => {
      expect(detectFileType(new File([], "test.txt"))).toBe("unknown");
      expect(detectFileType(new File([], "test.pdf"))).toBe("unknown");
      expect(detectFileType(new File([], "test"))).toBe("unknown");
      expect(detectFileType(new File([], ""))).toBe("unknown");
    });

    it("should handle files with multiple dots", () => {
      expect(detectFileType(new File([], "test.backup.gpx"))).toBe("gpx");
      expect(detectFileType(new File([], "test.2024.tcx"))).toBe("tcx");
      expect(detectFileType(new File([], "activity.2024-01-01.fit"))).toBe("fit");
    });

    it("should detect from MIME type", () => {
      expect(detectFileType(new File([], "test", { type: "application/gpx+xml" }))).toBe("gpx");
      expect(detectFileType(new File([], "test", { type: "application/vnd.garmin.tcx+xml" }))).toBe("tcx");
      expect(detectFileType(new File([], "test", { type: "application/octet-stream" }))).toBe("fit");
    });

    it("should return unknown for XML without specific type", () => {
      expect(detectFileType(new File([], "test", { type: "application/xml" }))).toBe("unknown");
      expect(detectFileType(new File([], "test", { type: "text/xml" }))).toBe("unknown");
    });
  });

  describe("isSupportedFileType", () => {
    it("should return true for supported types", () => {
      expect(isSupportedFileType(new File([], "test.gpx"))).toBe(true);
      expect(isSupportedFileType(new File([], "test.tcx"))).toBe(true);
      expect(isSupportedFileType(new File([], "test.fit"))).toBe(true);
    });

    it("should return false for unsupported types", () => {
      expect(isSupportedFileType(new File([], "test.txt"))).toBe(false);
      expect(isSupportedFileType(new File([], "test.pdf"))).toBe(false);
      expect(isSupportedFileType(new File([], "test", { type: "application/xml" }))).toBe(false);
    });
  });
});
