import { describe, it, expect } from "vitest";
import { parseTCX } from "~/utils/tcx-parser";

describe("parseTCX", () => {
  it("prefers DistanceMeters when present", () => {
    const tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Id>2024-01-01T00:00:00Z</Id>
      <Lap StartTime="2024-01-01T00:00:00Z">
        <Track>
          <Trackpoint>
            <Time>2024-01-01T00:00:00Z</Time>
            <Position>
              <LatitudeDegrees>37.7749</LatitudeDegrees>
              <LongitudeDegrees>-122.4194</LongitudeDegrees>
            </Position>
            <DistanceMeters>1000</DistanceMeters>
          </Trackpoint>
          <Trackpoint>
            <Time>2024-01-01T00:00:10Z</Time>
            <Position>
              <LatitudeDegrees>37.7759</LatitudeDegrees>
              <LongitudeDegrees>-122.4294</LongitudeDegrees>
            </Position>
            <DistanceMeters>1500</DistanceMeters>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

    const result = parseTCX(tcx);
    expect(result.records).toHaveLength(2);
    // normalized: first becomes 0, second becomes 500
    expect(result.records[0].d).toBeCloseTo(0, 6);
    expect(result.records[1].d).toBeCloseTo(500, 6);
  });
});

