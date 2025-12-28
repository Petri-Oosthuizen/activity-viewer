import type { ActivityRecord, ParseResult } from "~/types/activity";

interface TCXPoint {
  lat: number;
  lon: number;
  alt?: number;
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

function parseTCXPoint(trackpoint: Element): TCXPoint | null {
  const position = trackpoint.querySelector("Position");
  if (!position) {
    return null;
  }

  const latText = position.querySelector("LatitudeDegrees")?.textContent;
  const lonText = position.querySelector("LongitudeDegrees")?.textContent;

  if (!latText || !lonText) {
    return null;
  }

  const lat = parseFloat(latText);
  const lon = parseFloat(lonText);

  if (isNaN(lat) || isNaN(lon)) {
    return null;
  }

  const altText = trackpoint.querySelector("AltitudeMeters")?.textContent;
  const alt = altText ? parseFloat(altText) : undefined;

  const timeText = trackpoint.querySelector("Time")?.textContent;
  const time = timeText ? new Date(timeText) : undefined;

  const hrBpm = trackpoint.querySelector("HeartRateBpm");
  let hr: number | undefined;
  if (hrBpm) {
    const hrValue = hrBpm.querySelector("Value")?.textContent;
    if (hrValue) {
      hr = parseFloat(hrValue);
      if (isNaN(hr)) hr = undefined;
    }
  }

  const cadText = trackpoint.querySelector("Cadence")?.textContent;
  const cad = cadText ? parseFloat(cadText) : undefined;

  let pwr: number | undefined;
  const extensions = trackpoint.querySelector("Extensions");
  if (extensions) {
    const tpx = Array.from(extensions.children).find(
      (el) => el.localName === "TPX" || el.localName.endsWith("TPX"),
    );

    if (tpx) {
      const watts = Array.from(tpx.children).find(
        (el) => el.localName === "Watts" || el.localName === "PowerInWatts",
      );
      if (watts) {
        pwr = parseFloat(watts.textContent || "");
        if (isNaN(pwr)) pwr = undefined;
      }
    }

    const powerEl = Array.from(extensions.children).find(
      (el) => el.localName === "power" || el.localName === "PowerInWatts",
    );
    if (powerEl && pwr === undefined) {
      pwr = parseFloat(powerEl.textContent || "");
      if (isNaN(pwr)) pwr = undefined;
    }
  }

  return { lat, lon, alt, time, hr, cad, pwr };
}

export function parseTCX(xmlText: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid TCX XML format");
  }

  const trackpoints = Array.from(doc.querySelectorAll("Trackpoint"));
  if (trackpoints.length === 0) {
    throw new Error("No track points found in TCX file");
  }

  const points: TCXPoint[] = [];
  for (const trackpoint of trackpoints) {
    const point = parseTCXPoint(trackpoint);
    if (point) {
      points.push(point);
    }
  }

  if (points.length === 0) {
    throw new Error("No valid track points found in TCX file");
  }

  const records: ActivityRecord[] = [];
  let cumulativeDistance = 0;
  const firstPoint = points[0];
  if (!firstPoint) {
    throw new Error("No valid track points found in TCX file");
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
      alt: point.alt,
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
