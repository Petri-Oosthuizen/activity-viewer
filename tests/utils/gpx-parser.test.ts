import { describe, it, expect } from "vitest";
import { parseGPX } from "~/utils/gpx-parser";

describe("parseGPX", () => {
  it("should parse a basic GPX file with track points", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2024-01-01T00:00:00Z</time>
      </trkpt>
      <trkpt lat="37.7750" lon="-122.4195">
        <ele>12</ele>
        <time>2024-01-01T00:00:01Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const result = parseGPX(gpx);

    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      t: 0,
      d: 0,
      alt: 10,
    });
    expect(result.records[1].t).toBeGreaterThan(0);
    expect(result.records[1].d).toBeGreaterThan(0);
    expect(result.records[1].alt).toBe(12);
    expect(result.startTime).toBeInstanceOf(Date);
  });

  it("should handle GPX files with heart rate data", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2024-01-01T00:00:00Z</time>
        <extensions>
          <TrackPointExtension>
            <hr>150</hr>
          </TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const result = parseGPX(gpx);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].hr).toBe(150);
  });

  it("should throw error for invalid XML", () => {
    expect(() => parseGPX("invalid xml")).toThrow();
  });

  it("should throw error for GPX without track points", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
</gpx>`;

    expect(() => parseGPX(gpx)).toThrow("No track points found");
  });
});
