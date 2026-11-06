import { describe, it, expect } from "vitest";
import { getFitGarminProductDisplayName } from "fit-file-parser/profile";
import { describeFITDevice } from "~/utils/parsers/fit-point-extractor";

const describeDevice = (fileId: Parameters<typeof describeFITDevice>[0]["fileId"]) =>
  describeFITDevice({ fileId, garminProductName: getFitGarminProductDisplayName });

describe("describeFITDevice", () => {
  it("names Garmin products", () => {
    expect(describeDevice({ manufacturer: "garmin", product: 4315 })).toBe("Garmin Forerunner 965");
  });

  it("prefers the product name from the file", () => {
    expect(describeDevice({ manufacturer: "wahoo_fitness", product: 31, product_name: "ELEMNT BOLT" })).toBe(
      "ELEMNT BOLT",
    );
  });

  it("falls back to manufacturer and product id", () => {
    expect(describeDevice({ manufacturer: "development", product: 29558 })).toBe("Development 29558");
  });

  it("returns undefined without a file id", () => {
    expect(describeDevice(undefined)).toBeUndefined();
  });
});
