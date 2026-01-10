/**
 * ECharts options builder
 * Extracted from store to maintain separation of concerns
 */

import type { MetricType, XAxisType, DeltaMode } from "./chart-config";
import { METRIC_LABELS, formatXAxisValue } from "./chart-config";
import { buildChartTooltip, type ChartTooltipItem } from "./tooltip-builder";

function formatAxisNumber(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  const rounded = n.toFixed(2);
  return rounded.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

/**
 * Build tooltip configuration for ECharts
 */
export function buildTooltipConfig(
  xAxisType: XAxisType,
  formatTooltipFn: (params: any) => string
) {
  return {
    show: true,
    trigger: "axis" as const,
    confine: true,
    maxWidth: 300,
    enterable: false,
    renderMode: "html" as const,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#e0e0e0",
    borderWidth: 1,
    padding: [8, 12],
    textStyle: {
      color: "#333",
      fontSize: 12,
    },
    axisPointer: {
      type: "line" as const,
      lineStyle: {
        color: "#999",
        width: 1,
        type: "dashed" as const,
      },
      label: {
        show: false,
      },
      triggerTooltip: true,
      show: true,
      snap: true,
    },
    formatter: (params: any) => {
      try {
        const result = formatTooltipFn(params);
        return result || '<div style="padding: 8px; color: #999;">No data</div>';
      } catch (error) {
        console.error("Tooltip formatter error:", error);
        return '<div style="padding: 8px; color: #999;">Error loading data</div>';
      }
    },
  };
}

/**
 * Build dataZoom configuration for ECharts
 */
export function buildDataZoomConfig(metricCount: number, yAxisCount: number) {
  void metricCount;
  void yAxisCount;
  return [
    {
      type: "slider",
      xAxisIndex: 0,
      bottom: "8%",
      height: 20,
      filterMode: "none",
      handleStyle: { color: "#5470c6" },
      dataBackground: {
        areaStyle: { color: "#e0e7ff" },
        lineStyle: { opacity: 0.8, color: "#5470c6" },
      },
      selectedDataBackground: {
        areaStyle: { color: "#c7d2fe" },
        lineStyle: { opacity: 1, color: "#5470c6" },
      },
      fillerColor: "rgba(84, 112, 198, 0.1)",
      borderColor: "#5470c6",
    },
    {
      type: "inside",
      xAxisIndex: 0,
      filterMode: "none",
      // Disable drag-to-pan; use toolbar pan controls instead.
      moveOnMouseMove: false,
      moveOnTouchMove: false,
      preventDefaultMouseMove: false,
      zoomOnMouseWheel: true,
      moveOnMouseWheel: false,
      throttle: 0,
      throttleDelay: 0,
    },
  ];
}

/**
 * Build X-axis configuration for ECharts
 */
export function buildXAxisConfig(xAxisType: XAxisType) {
  const axisLabel: any = { show: true };

  if (xAxisType === "localTime") {
    axisLabel.formatter = (value: number) => formatXAxisValue(value, "localTime");
  } else if (xAxisType === "distance") {
    axisLabel.formatter = (value: number) =>
      value >= 1000 ? `${(value / 1000).toFixed(1)}km` : `${value.toFixed(0)}m`;
  }

  return {
    type: "value",
    show: true,
    name:
      xAxisType === "localTime"
        ? "Local Time"
        : xAxisType === "time"
          ? "Time (seconds)"
          : "Distance (m/km)",
    nameLocation: "middle",
    nameGap: 35,
    nameTextStyle: { padding: [10, 0, 0, 0] },
    scale: true,
    axisLabel,
  };
}

/**
 * Build Y-axis configuration for ECharts
 */
export function buildYAxisConfig(
  metrics: MetricType[],
  showDelta: boolean,
  deltaMode: DeltaMode,
  selectedMetric: MetricType,
  hasActivities: boolean
) {
  // Delta-only mode: single axis for delta (no scaling)
  if (showDelta && deltaMode === "delta-only" && hasActivities) {
    return [
      {
        type: "value",
        show: true,
        name: `Δ ${METRIC_LABELS[selectedMetric]}`,
        nameLocation: "middle",
        nameGap: 35,
        nameRotate: 90,
        scale: true,
        axisLabel: { show: true, formatter: formatAxisNumber },
        position: "left",
      },
    ];
  }

  // Single metric mode
  if (metrics.length === 1 && !showDelta) {
    return {
      type: "value",
      show: true,
      name: METRIC_LABELS[metrics[0]],
      nameLocation: "middle",
      nameGap: 35,
      nameRotate: 90,
      scale: true,
      axisLabel: { show: true, formatter: formatAxisNumber },
    };
  }

  // Multi-metric: alternate left/right
  const axes = metrics.map((metric, i) => ({
    type: "value" as const,
    show: true,
    name: METRIC_LABELS[metric],
    nameLocation: "middle" as const,
    nameGap: 35,
    nameRotate: 90,
    scale: true,
    axisLabel: { show: true, formatter: formatAxisNumber },
    position: (i % 2 === 0 ? "left" : "right") as "left" | "right",
  }));

  // Add delta axis if needed (only scaled in overlay mode)
  if (showDelta && hasActivities) {
    const deltaLabel =
      deltaMode === "overlay"
        ? `Δ ${METRIC_LABELS[selectedMetric]} (×0.1)`
        : `Δ ${METRIC_LABELS[selectedMetric]}`;
    axes.push({
      type: "value" as const,
      show: true,
      name: deltaLabel,
      nameLocation: "middle" as const,
      nameGap: 35,
      nameRotate: 90,
      scale: true,
      axisLabel: { show: true, formatter: formatAxisNumber },
      position: "right" as "left" | "right",
    });
  }

  return axes;
}

/**
 * Build grid configuration for ECharts
 */
export function buildGridConfig(hasMultipleYAxes: boolean) {
  // Increase left/right margins when there are multiple Y-axes to accommodate labels
  const leftMargin = hasMultipleYAxes ? "8%" : "5%";
  const rightMargin = hasMultipleYAxes ? "8%" : "5%";

  return {
    left: leftMargin,
    right: rightMargin,
    bottom: "25%",
    top: "5%",
    containLabel: true,
  };
}

/**
 * Format tooltip params into HTML
 */
export function formatTooltipParams(
  params: any,
  xAxisType: XAxisType
): string {
  if (!params) return "";

  const paramsArray = Array.isArray(params) ? params : [params];
  if (paramsArray.length === 0) return "";

  const firstParam = paramsArray[0];
  if (!firstParam) return "";

  // Handle both axis trigger and item trigger
  const hoveredX =
    firstParam.axisValue !== undefined
      ? firstParam.axisValue
      : Array.isArray(firstParam.value)
        ? firstParam.value[0]
        : firstParam.value;

  if (hoveredX === undefined || hoveredX === null) return "";

  const axisValue =
    typeof hoveredX === "number"
      ? formatXAxisValue(hoveredX, xAxisType)
      : String(hoveredX);

  // Display values from all series that ECharts passed to us
  const tooltipItems: ChartTooltipItem[] = [];

  paramsArray.forEach((param: any) => {
    if (param?.value === undefined || param.value === null) return;

    const value = Array.isArray(param.value) ? param.value[1] : param.value;
    if (value === null || value === undefined) return;

    tooltipItems.push({
      name: param.seriesName || "Unknown",
      color: param.color || "#999",
      value: typeof value === "number" ? value.toFixed(1) : String(value),
    });
  });

  return buildChartTooltip(axisValue, tooltipItems);
}

