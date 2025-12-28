import { describe, it, expect } from "vitest";
import {
  formatTime,
  formatDistance,
  formatAltitude,
  formatHeartRate,
  formatPower,
  formatCadence,
  formatMetricValue,
} from "~/utils/format";

describe("format utilities", () => {
  describe("formatTime", () => {
    it("should format seconds as HH:MM:SS when hours > 0", () => {
      expect(formatTime(3661)).toBe("1:01:01");
      expect(formatTime(3600)).toBe("1:00:00");
    });

    it("should format seconds as MM:SS when hours = 0", () => {
      expect(formatTime(0)).toBe("0:00");
      expect(formatTime(59)).toBe("0:59");
      expect(formatTime(125)).toBe("2:05");
    });
  });

  describe("formatDistance", () => {
    it("should format meters as km when >= 1000", () => {
      expect(formatDistance(1000)).toBe("1.00 km");
      expect(formatDistance(1500)).toBe("1.50 km");
      expect(formatDistance(10000)).toBe("10.00 km");
    });

    it("should format meters as m when < 1000", () => {
      expect(formatDistance(0)).toBe("0 m");
      expect(formatDistance(500)).toBe("500 m");
      expect(formatDistance(999)).toBe("999 m");
    });
  });

  describe("formatAltitude", () => {
    it("should format altitude with unit", () => {
      expect(formatAltitude(0)).toBe("0 m");
      expect(formatAltitude(100)).toBe("100 m");
      expect(formatAltitude(1000)).toBe("1000 m");
      expect(formatAltitude(-50)).toBe("-50 m");
    });
  });

  describe("formatHeartRate", () => {
    it("should format heart rate with bpm unit", () => {
      expect(formatHeartRate(0)).toBe("0 bpm");
      expect(formatHeartRate(120)).toBe("120 bpm");
      expect(formatHeartRate(200)).toBe("200 bpm");
    });
  });

  describe("formatPower", () => {
    it("should format power with W unit", () => {
      expect(formatPower(0)).toBe("0 W");
      expect(formatPower(250)).toBe("250 W");
      expect(formatPower(1000)).toBe("1000 W");
    });
  });

  describe("formatCadence", () => {
    it("should format cadence with rpm unit", () => {
      expect(formatCadence(0)).toBe("0 rpm");
      expect(formatCadence(90)).toBe("90 rpm");
      expect(formatCadence(120)).toBe("120 rpm");
    });
  });

  describe("formatMetricValue", () => {
    it("should format hr metric", () => {
      expect(formatMetricValue(120, "hr")).toBe("120 bpm");
    });

    it("should format alt metric", () => {
      expect(formatMetricValue(100, "alt")).toBe("100 m");
    });

    it("should format pwr metric", () => {
      expect(formatMetricValue(250, "pwr")).toBe("250 W");
    });

    it("should format cad metric", () => {
      expect(formatMetricValue(90, "cad")).toBe("90 rpm");
    });

    it("should handle unknown metric types", () => {
      expect(formatMetricValue(123.456, "unknown")).toBe("123.5");
    });
  });
});

