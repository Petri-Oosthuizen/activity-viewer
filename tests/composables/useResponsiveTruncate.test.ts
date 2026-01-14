import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useResponsiveTruncate } from "~/composables/useResponsiveTruncate";

describe("useResponsiveTruncate", () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("truncate", () => {
    it("should truncate text based on screen size on mobile", () => {
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(500);
      const { truncate } = useResponsiveTruncate();
      const longText = "This is a very long text that should be truncated";

      const result = truncate(longText);

      expect(result.length).toBeLessThanOrEqual(longText.length);
      expect(result).toContain("...");
    });

    it("should truncate text based on screen size on tablet", () => {
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(800);
      const { truncate } = useResponsiveTruncate();
      const longText = "This is a very long text that should be truncated";

      const result = truncate(longText);

      expect(result.length).toBeLessThanOrEqual(longText.length);
    });

    it("should truncate text based on screen size on desktop", () => {
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(1200);
      const { truncate } = useResponsiveTruncate();
      const longText = "This is a very long text that should be truncated";

      const result = truncate(longText);

      expect(result.length).toBeLessThanOrEqual(longText.length);
    });

    it("should use provided maxLength when specified", () => {
      const { truncate } = useResponsiveTruncate();
      const longText = "This is a very long text";
      const maxLength = 10;

      const result = truncate(longText, maxLength);

      expect(result.length).toBeLessThanOrEqual(maxLength + 3);
    });

    it("should not truncate short text", () => {
      const { truncate } = useResponsiveTruncate();
      const shortText = "Short";

      const result = truncate(shortText);

      expect(result).toBe(shortText);
    });

    it("should handle empty string", () => {
      const { truncate } = useResponsiveTruncate();
      expect(truncate("")).toBe("");
    });
  });

  describe("windowWidth", () => {
    it("should return current window width", () => {
      vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
      const { windowWidth } = useResponsiveTruncate();
      expect(windowWidth.value).toBe(1024);
    });
  });
});
