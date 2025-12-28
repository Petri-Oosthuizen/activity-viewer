import type { ActivityRecord, ParseResult } from "~/types/activity";

interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: Date;
  hr?: number;
  cad?: number;
  pwr?: number;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseGPXPoint(trkpt: Element): GPXPoint | null {
  const lat = parseFloat(trkpt.getAttribute("lat") || "");
  const lon = parseFloat(trkpt.getAttribute("lon") || "");

  if (isNaN(lat) || isNaN(lon)) {
    return null;
  }

  const eleText = trkpt.querySelector("ele")?.textContent;
  const ele = eleText ? parseFloat(eleText) : undefined;

  const timeText = trkpt.querySelector("time")?.textContent;
  const time = timeText ? new Date(timeText) : undefined;

  const extensions = trkpt.querySelector("extensions");
  let hr: number | undefined;
  let cad: number | undefined;
  let pwr: number | undefined;

  if (extensions) {
    const powerEl = Array.from(extensions.children).find((el) => el.localName === "power");
    if (powerEl) {
      pwr = parseFloat(powerEl.textContent || "");
      if (isNaN(pwr)) pwr = undefined;
    }

    const trackPointExt = Array.from(extensions.children).find(
      (el) =>
        el.localName === "TrackPointExtension" || el.localName.endsWith("TrackPointExtension"),
    );

    if (trackPointExt) {
      const hrEl = Array.from(trackPointExt.children).find((el) => el.localName === "hr");
      if (hrEl) {
        hr = parseFloat(hrEl.textContent || "");
        if (isNaN(hr)) hr = undefined;
      }

      const cadEl = Array.from(trackPointExt.children).find((el) => el.localName === "cad");
      if (cadEl) {
        cad = parseFloat(cadEl.textContent || "");
        if (isNaN(cad)) cad = undefined;
      }
    }
  }

  return { lat, lon, ele, time, hr, cad, pwr };
}

export function parseGPX(xmlText: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX XML format");
  }

  const trkpts = Array.from(doc.querySelectorAll("trkpt"));
  if (trkpts.length === 0) {
    throw new Error("No track points found in GPX file");
  }

  const points: GPXPoint[] = [];
  for (const trkpt of trkpts) {
    const point = parseGPXPoint(trkpt);
    if (point) {
      points.push(point);
    }
  }

  if (points.length === 0) {
    throw new Error("No valid track points found in GPX file");
  }

  const records: ActivityRecord[] = [];
  let cumulativeDistance = 0;
  const firstPoint = points[0];
  if (!firstPoint) {
    throw new Error("No valid track points found in GPX file");
  }
  const startTime = firstPoint.time || new Date();

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point) {
      continue;
    }

    let elapsedTime = 0;
    if (point.time) {
      elapsedTime = (point.time.getTime() - startTime.getTime()) / 1000;
    } else if (i > 0) {
      const prevPoint = points[i - 1];
      if (prevPoint?.time) {
        const prevTime = prevPoint.time;
        let estimatedInterval = 1;
        if (i > 1) {
          const prevPrevPoint = points[i - 2];
          if (prevPrevPoint?.time) {
            estimatedInterval = (prevPoint.time.getTime() - prevPrevPoint.time.getTime()) / 1000;
          }
        }
        elapsedTime = (prevTime.getTime() - startTime.getTime()) / 1000 + estimatedInterval;
      } else {
        elapsedTime = i;
      }
    } else {
      elapsedTime = i;
    }

    if (i > 0) {
      const prevPoint = points[i - 1];
      if (prevPoint) {
        const distance = haversineDistance(prevPoint.lat, prevPoint.lon, point.lat, point.lon);
        cumulativeDistance += distance;
      }
    }

    const record: ActivityRecord = {
      t: Math.max(0, elapsedTime),
      d: cumulativeDistance,
      lat: point.lat,
      lon: point.lon,
      alt: point.ele,
      hr: point.hr,
      cad: point.cad,
      pwr: point.pwr,
    };

    records.push(record);
  }

  return {
    records,
    startTime: startTime instanceof Date ? startTime : undefined,
  };
}
