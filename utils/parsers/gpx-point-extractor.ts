import type { RawPoint } from "../activity-parser-common";

export function extractGPXPoints(doc: Document): RawPoint[] {
  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX XML format");
  }

  const trkpts = Array.from(doc.querySelectorAll("trkpt"));
  if (trkpts.length === 0) {
    throw new Error("No track points found in GPX file");
  }

  const points: RawPoint[] = [];
  for (const trkpt of trkpts) {
    const point = parseGPXPoint(trkpt);
    if (point) {
      points.push(point);
    }
  }

  if (points.length === 0) {
    throw new Error("No valid track points found in GPX file");
  }

  return points;
}

function parseGPXPoint(trkpt: Element): RawPoint | null {
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
  let distanceMeters: number | undefined;

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

      const distanceEl = Array.from(trackPointExt.children).find(
        (el) => el.localName === "distance" || el.localName === "Distance",
      );
      if (distanceEl) {
        const distanceValue = parseFloat(distanceEl.textContent || "");
        if (!isNaN(distanceValue)) {
          distanceMeters = distanceValue;
        }
      }
    }

    const distanceEl = Array.from(extensions.children).find(
      (el) =>
        (el.localName === "distance" || el.localName === "Distance") && el !== trackPointExt,
    );
    if (distanceEl && distanceMeters === undefined) {
      const distanceValue = parseFloat(distanceEl.textContent || "");
      if (!isNaN(distanceValue)) {
        distanceMeters = distanceValue;
      }
    }
  }

  let speed: number | undefined;
  let temp: number | undefined;
  const additionalFields: Record<string, number> = {};

  if (extensions) {
    const speedEl = Array.from(extensions.children).find(
      (el) => el.localName === "speed" || el.localName === "Speed",
    );
    if (speedEl) {
      speed = parseFloat(speedEl.textContent || "");
      if (isNaN(speed) || speed < 0) speed = undefined;
    }

    const tempEl = Array.from(extensions.children).find(
      (el) => el.localName === "temperature" || el.localName === "Temperature" || el.localName === "temp" || el.localName === "Temp",
    );
    if (tempEl) {
      temp = parseFloat(tempEl.textContent || "");
      if (isNaN(temp)) temp = undefined;
    }

    // Extract additional TrackPointExtension fields
    const trackPointExt = Array.from(extensions.children).find(
      (el) =>
        el.localName === "TrackPointExtension" || el.localName.endsWith("TrackPointExtension"),
    );
    if (trackPointExt) {
      for (const child of Array.from(trackPointExt.children)) {
        const fieldName = child.localName;
        if (fieldName === "hr" || fieldName === "cad") continue; // Already handled

        const text = child.textContent?.trim();
        if (!text) continue;

        const value = parseFloat(text);
        if (isNaN(value) || !Number.isFinite(value)) continue;

        // Known fields with standard names
        if (fieldName === "atemp") {
          additionalFields["atemp_c"] = value;
        } else if (fieldName === "sat") {
          additionalFields["satellites"] = value;
        } else if (fieldName === "hdop") {
          additionalFields["hdop"] = value;
        } else if (fieldName === "vdop") {
          additionalFields["vdop"] = value;
        } else {
          // Unknown field - add with original name
          additionalFields[fieldName] = value;
        }
      }
    }

    // Also check direct extension children for additional fields
    for (const child of Array.from(extensions.children)) {
      const fieldName = child.localName;
      if (fieldName === "TrackPointExtension" || fieldName.endsWith("TrackPointExtension") || 
          fieldName === "power" || fieldName === "speed" || fieldName === "Speed" ||
          fieldName === "temperature" || fieldName === "Temperature" || fieldName === "temp" || fieldName === "Temp" ||
          fieldName === "distance" || fieldName === "Distance") {
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
    alt: ele,
    time,
    hr,
    cad,
    pwr,
    distanceMeters,
    speed,
    temp,
    additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined,
  };
}
