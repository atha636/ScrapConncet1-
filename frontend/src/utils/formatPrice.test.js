import { describe, test, expect } from "vitest";
import { formatPrice } from "./formatPrice";

describe("formatPrice", () => {
  test("formats a whole number as INR currency", () => {
    expect(formatPrice(500)).toBe("₹500");
  });

  test("rounds to whole rupees (no decimals shown)", () => {
    expect(formatPrice(499.6)).toBe("₹500");
  });

  test("formats zero correctly", () => {
    expect(formatPrice(0)).toBe("₹0");
  });

  test("adds thousands separators for larger amounts", () => {
    expect(formatPrice(125000)).toBe("₹1,25,000");
  });

  test("returns an em dash for null", () => {
    expect(formatPrice(null)).toBe("—");
  });

  test("returns an em dash for undefined", () => {
    expect(formatPrice(undefined)).toBe("—");
  });

  test("returns an em dash for a non-numeric value", () => {
    expect(formatPrice("not a number")).toBe("—");
  });
});