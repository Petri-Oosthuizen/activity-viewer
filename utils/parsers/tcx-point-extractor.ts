import type { RawPoint } from "../activity-parser-common";

export function extractTCXPoints(doc: Document): RawPoint[] {
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid TCX XML format");
  }

  const trackpoints = Array.from(doc.querySelectorAll("Trackpoint"));
  if (trackpoints.length === 0) {
    throw new Error("No track points found in TCX file");
  }

  const points: RawPoint[] = [];
  for (const trackpoint of trackpoints) {
    const point = parseTCXPoint(trackpoint);
    if (point) {
      points.push(point);
    }
  }

  if (points.length === 0) {
    throw new Error("No valid track points found in TCX file");
  }

  return points;
}

function parseTCXPoint(trackpoint: Element): RawPoint | null {
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

  const distanceText = trackpoint.querySelector("DistanceMeters")?.textContent;
  const distanceMeters = distanceText ? parseFloat(distanceText) : undefined;

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
  let speed: number | undefined;
  let temp: number | undefined;
  const additionalFields: Record<string, number> = {};
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

      const speedEl = Array.from(tpx.children).find(
        (el) => el.localName === "Speed",
      );
      if (speedEl) {
        speed = parseFloat(speedEl.textContent || "");
        if (isNaN(speed) || speed < 0) speed = undefined;
      }

      // Extract additional TPX fields
      for (const child of Array.from(tpx.children)) {
        const fieldName = child.localName;
        if (fieldName === "Watts" || fieldName === "PowerInWatts" || fieldName === "Speed") {
          continue; // Already handled
        }

        const text = child.textContent?.trim();
        if (!text) continue;

        const value = parseFloat(text);
        if (isNaN(value) || !Number.isFinite(value)) continue;

        additionalFields[fieldName] = value;
      }
    }

    const powerEl = Array.from(extensions.children).find(
      (el) => el.localName === "power" || el.localName === "PowerInWatts",
    );
    if (powerEl && pwr === undefined) {
      pwr = parseFloat(powerEl.textContent || "");
      if (isNaN(pwr)) pwr = undefined;
    }

    // Also check other extension children
    for (const child of Array.from(extensions.children)) {
      const fieldName = child.localName;
      if (fieldName === "TPX" || fieldName.endsWith("TPX") || fieldName === "power" || fieldName === "PowerInWatts") {
        continue; // Already handled
      }

      const text = child.textContent?.trim();
      if (!text) continue;

      const value = parseFloat(text);
      if (isNaN(value) || !Number.isFinite(value)) continue;

      additionalFields[fieldName] = value;
    }
  }

  return {
    lat,
    lon,
    alt,
    time,
    hr,
    cad,
    pwr,
    speed,
    temp,
    distanceMeters: distanceMeters !== undefined && !isNaN(distanceMeters) ? distanceMeters : undefined,
    additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined,
  };
}
