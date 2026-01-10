/**
 * Tooltip building utilities for consistent tooltip rendering
 * across charts and maps
 */

import type { Activity, ActivityRecord } from "~/types/activity";
import { formatTime, formatDistance, formatHeartRate } from "./format";
import { truncateMiddleSmart } from "./text-truncate";

/**
 * Build tooltip HTML for a single activity data point (table format)
 */
export function buildPointTooltip(activity: Activity, record: ActivityRecord): string {
  return buildMultiActivityTooltip([{ activity, record }]);
}

/**
 * Build tooltip HTML for multiple overlapping activities (table format)
 */
export function buildMultiActivityTooltip(
  activities: Array<{ activity: Activity; record: ActivityRecord }>,
): string {
  if (activities.length === 0) return "";

  const hasHr = activities.some(({ record }) => record.hr !== undefined);
  const hasPwr = activities.some(({ record }) => record.pwr !== undefined);
  const hasAlt = activities.some(({ record }) => record.alt !== undefined);
  const hasCad = activities.some(({ record }) => record.cad !== undefined);

  let html = `
    <div style="font-family: system-ui, sans-serif; font-size: 10px;">
      <table style="border-collapse: collapse; width: 100%; font-size: 10px;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 2px 4px 2px 0; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;"></th>`;

  activities.forEach(({ activity }) => {
    const truncatedName = truncateMiddleSmart(activity.name, 12);
    html += `
            <th style="text-align: center; padding: 2px 3px; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 3px;">
                <span style="width: 6px; height: 6px; background: ${activity.color}; border-radius: 50%; flex-shrink: 0;"></span>
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60px;" title="${activity.name}">${truncatedName}</span>
              </div>
            </th>`;
  });

  html += `
          </tr>
        </thead>
        <tbody>`;

  const metricRows = [
    {
      label: "Time",
      getValue: (record: ActivityRecord) => `${formatTime(record.t)} mins`,
      show: true,
    },
    {
      label: "Distance",
      getValue: (record: ActivityRecord) => formatDistance(record.d),
      show: true,
    },
    {
      label: "Heart Rate",
      getValue: (record: ActivityRecord) => record.hr !== undefined ? formatHeartRate(record.hr) : "-",
      show: hasHr,
    },
    {
      label: "Power",
      getValue: (record: ActivityRecord) => `${record.pwr} W`,
      show: hasPwr,
    },
    {
      label: "Altitude",
      getValue: (record: ActivityRecord) => `${Math.round(record.alt ?? 0)} m`,
      show: hasAlt,
    },
    {
      label: "Cadence",
      getValue: (record: ActivityRecord) => String(record.cad),
      show: hasCad,
    },
  ];

  metricRows.forEach((metric) => {
    if (!metric.show) return;

    html += `
          <tr>`;
    html += `
            <td style="text-align: right; padding: 1px 4px 1px 0; color: #666; font-weight: 500;">${metric.label}:</td>`;

    activities.forEach(({ record }) => {
      const value = metric.label === "Heart Rate" && record.hr === undefined
        ? "-"
        : metric.label === "Power" && record.pwr === undefined
          ? "-"
          : metric.label === "Altitude" && record.alt === undefined
            ? "-"
            : metric.label === "Cadence" && record.cad === undefined
              ? "-"
              : metric.getValue(record);

      html += `
            <td style="text-align: right; padding: 1px 3px; font-weight: 500;">${value}</td>`;
    });

    html += `
          </tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>`;
  return html;
}

/**
 * Build chart tooltip content
 */
export interface ChartTooltipItem {
  name: string;
  color: string;
  value: string;
}

export function buildChartTooltip(axisValue: string, items: ChartTooltipItem[]): string {
  let result = `<div style="margin-bottom: 6px; font-weight: 600; font-size: 12px; color: #333; padding-bottom: 4px; border-bottom: 1px solid #e0e0e0;">${axisValue}</div>`;

  if (items.length === 0) {
    return (
      result +
      `<div style="padding: 8px; color: #999; font-size: 11px;">No data at this point</div>`
    );
  }

  items.forEach((item) => {
    const name = truncateMiddleSmart(item.name, 30);
    result += `<div style="margin: 2px 0; display: flex; align-items: center; font-size: 11px; line-height: 1.4;">
      <span style="display: inline-block; width: 8px; height: 8px; background-color: ${item.color}; border-radius: 50%; margin-right: 6px; flex-shrink: 0;"></span>
      <span style="font-weight: 500; color: #333; min-width: 80px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 1;" title="${item.name}">${name}</span>
      <span style="color: #333; font-weight: 600; min-width: 50px; text-align: right; flex-shrink: 0;">${item.value}</span>
    </div>`;
  });

  return result;
}
