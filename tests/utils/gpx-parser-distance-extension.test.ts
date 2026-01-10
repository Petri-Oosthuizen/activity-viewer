import { describe, it, expect } from "vitest";
import { parseGPX } from "~/utils/gpx-parser";

describe("parseGPX with distance extensions", () => {
  it("should use distance from TrackPointExtension when present", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2024-01-01T00:00:00Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:distance>0</gpxtpx:distance>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
      <trkpt lat="37.7750" lon="-122.4195">
        <ele>12</ele>
        <time>2024-01-01T00:00:05Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:distance>500</gpxtpx:distance>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const result = parseGPX(gpx);

    expect(result.records).toHaveLength(2);
    expect(result.records[0].d).toBeCloseTo(0, 6);
    expect(result.records[1].d).toBeCloseTo(500, 6);
  });

  it("should use distance from extensions when present (outside TrackPointExtension)", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2024-01-01T00:00:00Z</time>
        <extensions>
          <distance>0</distance>
        </extensions>
      </trkpt>
      <trkpt lat="37.7750" lon="-122.4195">
        <ele>12</ele>
        <time>2024-01-01T00:00:05Z</time>
        <extensions>
          <distance>500</distance>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const result = parseGPX(gpx);

    expect(result.records).toHaveLength(2);
    expect(result.records[0].d).toBeCloseTo(0, 6);
    expect(result.records[1].d).toBeCloseTo(500, 6);
  });

  it("should prefer TrackPointExtension distance over direct extensions distance", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <trk>
    <trkseg>
      <trkpt lat="37.7749" lon="-122.4194">
        <ele>10</ele>
        <time>2024-01-01T00:00:00Z</time>
        <extensions>
          <distance>100</distance>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:distance>0</gpxtpx:distance>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const result = parseGPX(gpx);

    expect(result.records).toHaveLength(1);
    expect(result.records[0].d).toBeCloseTo(0, 6);
  });

  it("should fall back to GPS-calculated distance when no distance extension present", () => {
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
    expect(result.records[0].d).toBeCloseTo(0, 6);
    expect(result.records[1].d).toBeGreaterThan(0);
  });
});
