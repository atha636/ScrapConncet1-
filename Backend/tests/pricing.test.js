const { estimatePrice, BASE_RATE_PER_KG } = require("../src/utils/pricing");

describe("estimatePrice", () => {
  test("multiplies the per-kg rate by weight for a known scrap type", () => {
    expect(estimatePrice("metal", 3)).toBe(BASE_RATE_PER_KG.metal * 3);
  });

  test("defaults to 1kg when no weight is given", () => {
    expect(estimatePrice("paper")).toBe(BASE_RATE_PER_KG.paper);
  });

  test("falls back to the 'other' rate for an unrecognized scrap type", () => {
    expect(estimatePrice("unknown-type", 2)).toBe(BASE_RATE_PER_KG.other * 2);
  });

  test("never returns less than the minimum price, even for tiny weights", () => {
    expect(estimatePrice("glass", 0.01)).toBeGreaterThanOrEqual(5);
  });

  test("treats a zero or negative weight the same as the 1kg default", () => {
    expect(estimatePrice("metal", 0)).toBe(estimatePrice("metal"));
    expect(estimatePrice("metal", -5)).toBe(estimatePrice("metal"));
  });

  test("rounds the final price to a whole number", () => {
    const price = estimatePrice("plastic", 2.37);
    expect(Number.isInteger(price)).toBe(true);
  });
});