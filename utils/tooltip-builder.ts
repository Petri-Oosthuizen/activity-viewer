/**
 * Tooltip building utilities for consistent tooltip rendering
 * across charts and maps
 */

import type { Activity, ActivityRecord } from "~/types/activity";
import { formatTime, formatDistance } from "./format";
import { truncateMiddleSmart } from "./text-truncate";

/**
 * Build tooltip HTML for a single activity data point
 */
export function buildPointTooltip(activity: Activity, record: ActivityRecord): string {
  let html = `
    <div style="font-family: system-ui, sans-serif; font-size: 10px; min-width: 140px; max-width: 200px;">
      <div style="font-weight: 600; margin-bottom: 3px; padding-bottom: 2px; border-bottom: 1px solid #e0e0e0; display: flex; align-items: flex-start; gap: 4px;">
        <span style="width: 8px; height: 8px; background: ${activity.color}; border-radius: 50%; flex-shrink: 0; margin-top: 2px;"></span>
        <span style="word-break: break-word; line-height: 1.3; max-height: 2.6em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 10px;" title="${activity.name}">${activity.name}</span>
      </div>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 1px 6px; font-size: 10px;">
        <span style="color: #666;">T:</span>
        <span style="font-weight: 500;">${formatTime(record.t)}</span>
        <span style="color: #666;">D:</span>
        <span style="font-weight: 500;">${formatDistance(record.d)}</span>`;

  if (record.hr !== undefined) {
    html += `
        <span style="color: #666;">HR:</span>
        <span style="font-weight: 500;">${record.hr}</span>`;
  }
  if (record.pwr !== undefined) {
    html += `
        <span style="color: #666;">P:</span>
        <span style="font-weight: 500;">${record.pwr} W</span>`;
  }
  if (record.alt !== undefined) {
    html += `
        <span style="color: #666;">A:</span>
        <span style="font-weight: 500;">${Math.round(record.alt)} m</span>`;
  }
  if (record.cad !== undefined) {
    html += `
        <span style="color: #666;">C:</span>
        <span style="font-weight: 500;">${record.cad}</span>`;
  }

  html += `
      </div>
    </div>`;
  return html;
}

/**
 * Build tooltip HTML for multiple overlapping activities
 */
export function buildMultiActivityTooltip(
  activities: Array<{ activity: Activity; record: ActivityRecord }>,
): string {
  let html = `
    <div style="font-family: system-ui, sans-serif; font-size: 10px; min-width: 160px; max-width: 240px;">
      <div style="font-weight: 600; margin-bottom: 3px; padding-bottom: 2px; border-bottom: 2px solid #e0e0e0; color: #333; font-size: 10px;">
        ${activities.length} ${activities.length === 1 ? "Activity" : "Activities"}
      </div>`;

  activities.forEach(({ activity, record }, index) => {
    const isLast = index === activities.length - 1;
    html += `
      <div style="${!isLast ? "margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px solid #f0f0f0;" : ""}">
        <div style="font-weight: 600; margin-bottom: 2px; display: flex; align-items: flex-start; gap: 4px;">
          <span style="width: 8px; height: 8px; background: ${activity.color}; border-radius: 50%; flex-shrink: 0; margin-top: 2px;"></span>
          <span style="word-break: break-word; line-height: 1.3; max-height: 2.6em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 10px;" title="${activity.name}">${activity.name}</span>
        </div>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 1px 6px; font-size: 9px; margin-left: 12px;">
          <span style="color: #666;">T:</span>
          <span style="font-weight: 500;">${formatTime(record.t)}</span>
          <span style="color: #666;">D:</span>
          <span style="font-weight: 500;">${formatDistance(record.d)}</span>`;

    if (record.hr !== undefined) {
      html += `
          <span style="color: #666;">HR:</span>
          <span style="font-weight: 500;">${record.hr}</span>`;
    }
    if (record.pwr !== undefined) {
      html += `
          <span style="color: #666;">P:</span>
          <span style="font-weight: 500;">${record.pwr} W</span>`;
    }
    if (record.alt !== undefined) {
      html += `
          <span style="color: #666;">A:</span>
          <span style="font-weight: 500;">${Math.round(record.alt)} m</span>`;
    }
    if (record.cad !== undefined) {
      html += `
          <span style="color: #666;">C:</span>
          <span style="font-weight: 500;">${record.cad}</span>`;
    }

    html += `
        </div>
      </div>`;
  });

  html += `
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
