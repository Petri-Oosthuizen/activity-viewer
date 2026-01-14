import { describe, it, expect } from "vitest";
import { truncateMiddleSmart } from "~/utils/text-truncate";

describe("text-truncate", () => {
  describe("truncateMiddleSmart", () => {
    it("should return original string if shorter than maxLength", () => {
      expect(truncateMiddleSmart("short", 10)).toBe("short");
      expect(truncateMiddleSmart("", 10)).toBe("");
    });

    it("should truncate long strings in the middle", () => {
      const longText = "This is a very long text that needs truncation";
      const result = truncateMiddleSmart(longText, 20);
      
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain("...");
      expect(result).not.toBe(longText);
    });

    it("should handle exact length strings", () => {
      const text = "Exactly twenty chars!";
      const result = truncateMiddleSmart(text, 20);
      
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it("should handle very short maxLength", () => {
      const text = "This is a test";
      const result = truncateMiddleSmart(text, 5);
      
      expect(result.length).toBeLessThanOrEqual(5);
      // When maxLength is very short, it may just return the substring without ellipsis
      expect(result.length).toBe(5);
    });

    it("should preserve start and end of string when truncating", () => {
      const text = "This is a very long text";
      const result = truncateMiddleSmart(text, 15);
      
      expect(result.startsWith("This")).toBe(true);
      expect(result.endsWith("text")).toBe(true);
      expect(result).toContain("...");
    });

    it("should handle unicode characters", () => {
      const text = "测试文本这是一个很长的文本";
      const result = truncateMiddleSmart(text, 10);
      
      expect(result.length).toBeLessThanOrEqual(10);
      expect(result).toContain("...");
    });

    it("should handle maxLength of 0 or negative", () => {
      const text = "Test";
      // When maxLength <= ellipsis.length, it returns substring without ellipsis
      expect(truncateMiddleSmart(text, 0).length).toBe(0);
      expect(truncateMiddleSmart(text, -1).length).toBe(0);
    });
  });
});
