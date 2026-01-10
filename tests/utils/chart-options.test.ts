import { describe, it, expect } from "vitest";
import {
  buildTooltipConfig,
  buildDataZoomConfig,
  buildXAxisConfig,
  buildYAxisConfig,
  buildGridConfig,
  formatTooltipParams,
} from "~/utils/chart-options";
import type { XAxisType, MetricType } from "~/utils/chart-config";

describe("chart-options", () => {
  describe("buildTooltipConfig", () => {
    it("should build tooltip configuration", () => {
      const formatFn = () => "test";
      const config = buildTooltipConfig("time", formatFn);

      expect(config.show).toBe(true);
      expect(config.trigger).toBe("axis");
      expect(config.renderMode).toBe("html");
      expect(config.formatter).toBeDefined();
    });

    it("should use custom formatter function", () => {
      const formatFn = (params: any) => `Custom: ${params.length}`;
      const config = buildTooltipConfig("time", formatFn);

      const result = config.formatter([{ value: [100, 120] }]);
      expect(result).toContain("Custom: 1");
    });

    it("should handle formatter errors gracefully", () => {
      const formatFn = () => {
        throw new Error("Test error");
      };
      const config = buildTooltipConfig("time", formatFn);

      const result = config.formatter([{ value: [100, 120] }]);
      expect(result).toContain("Error loading data");
    });
  });

  describe("buildDataZoomConfig", () => {
    it("should build dataZoom configuration", () => {
      const config = buildDataZoomConfig(1, 1);

      expect(config.length).toBeGreaterThan(1);
      expect(config[0].type).toBe("slider");
      expect(config[1].type).toBe("inside");
    });

    it("should configure slider", () => {
      const config = buildDataZoomConfig(1, 1);
      const slider = config[0];

      expect(slider.xAxisIndex).toBe(0);
    });

    it("should configure inside zoom", () => {
      const config = buildDataZoomConfig("time");
      const inside = config[1];

      expect(inside.zoomOnMouseWheel).toBe(true);
      expect(inside.moveOnMouseMove).toBe(false);
    });
  });

  describe("buildXAxisConfig", () => {
    it("should build time axis config", () => {
      const config = buildXAxisConfig("time");

      expect(config.type).toBe("value");
      expect(config.name).toBe("Time (seconds)");
      expect(config.nameLocation).toBe("middle");
    });

    it("should build distance axis config", () => {
      const config = buildXAxisConfig("distance");

      expect(config.type).toBe("value");
      expect(config.name).toBe("Distance (m/km)");
    });

    it("should build localTime axis config", () => {
      const config = buildXAxisConfig("localTime");

      expect(config.type).toBe("value");
      expect(config.name).toBe("Local Time");
    });

    it("should format axis labels for distance", () => {
      const config = buildXAxisConfig("distance");

      expect(config.axisLabel.formatter).toBeDefined();
      const result = config.axisLabel.formatter(1000);
      expect(result).toContain("1.0km");
    });
  });

  describe("buildYAxisConfig", () => {
    it("should build single y-axis config", () => {
      const config = buildYAxisConfig(["hr"], false, "overlay", "hr", true);

      expect(Array.isArray(config) ? config.length : 1).toBe(1);
      const axis = Array.isArray(config) ? config[0] : config;
      expect(axis.name).toContain("Heart Rate");
      expect(axis.type).toBe("value");
    });

    it("should build multiple y-axis configs", () => {
      const config = buildYAxisConfig(["hr", "alt"], false, "overlay", "hr", true);

      expect(Array.isArray(config)).toBe(true);
      if (Array.isArray(config)) {
        expect(config).toHaveLength(2);
        expect(config[0].name).toContain("Heart Rate");
        expect(config[1].name).toContain("Altitude");
      }
    });

    it("should position axes correctly", () => {
      const config = buildYAxisConfig(["hr", "alt"], false, "overlay", "hr", true);

      if (Array.isArray(config)) {
        expect(config[0].position).toBe("left");
        expect(config[1].position).toBe("right");
      }
    });
  });

  describe("buildGridConfig", () => {
    it("should build grid configuration", () => {
      const config = buildGridConfig(false);

      expect(config.left).toBeDefined();
      expect(config.right).toBeDefined();
      expect(config.top).toBeDefined();
      expect(config.bottom).toBeDefined();
    });

    it("should adjust margins for multiple axes", () => {
      const singleAxis = buildGridConfig(false);
      const multiAxis = buildGridConfig(true);

      expect(multiAxis.right).toBe("8%");
      expect(singleAxis.right).toBe("5%");
    });
  });

  describe("formatTooltipParams", () => {
    it("should format tooltip params", () => {
      const params = [
        {
          seriesName: "Activity 1 - Heart Rate (bpm)",
          value: [100, 120],
          color: "#5470c6",
        },
      ];

      const result = formatTooltipParams(params, "time");
      expect(result).toContain("Activity 1");
      expect(result).toContain("120");
    });

    it("should handle multiple series", () => {
      const params = [
        {
          seriesName: "Activity 1 - Heart Rate (bpm)",
          value: [100, 120],
          color: "#5470c6",
        },
        {
          seriesName: "Activity 2 - Heart Rate (bpm)",
          value: [100, 130],
          color: "#91cc75",
        },
      ];

      const result = formatTooltipParams(params, "time");
      expect(result).toContain("Activity 1");
      expect(result).toContain("Activity 2");
    });

    it("should format x-axis value correctly", () => {
      const params = [
        {
          seriesName: "Activity 1 - Heart Rate (bpm)",
          value: [100, 120],
          color: "#5470c6",
        },
      ];

      const timeResult = formatTooltipParams(params, "time");
      expect(timeResult).toContain("100.0s");

      const distanceResult = formatTooltipParams(params, "distance");
      expect(distanceResult).toContain("100");
    });
  });
});

