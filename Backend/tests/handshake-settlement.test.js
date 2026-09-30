// Pure-logic tests — no database needed.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
const { deriveOtp, otpMatches } = require("../src/utils/handshake");
const { computeSettlement } = require("../src/utils/settlement");

describe("OTP handshake", () => {
  test("is a stable 4-digit code per pickup+collector", () => {
    const a = deriveOtp("p1", "c1");
    expect(a).toMatch(/^\d{4}$/);
    expect(deriveOtp("p1", "c1")).toBe(a);
  });
  test("changes when the collector changes", () => {
    const codes = new Set(["c1", "c2", "c3", "c4", "c5", "c6"].map((c) => deriveOtp("p1", c)));
    expect(codes.size).toBeGreaterThan(1);
  });
  test("otpMatches compares exactly", () => {
    expect(otpMatches("0123", "0123")).toBe(true);
    expect(otpMatches("0123", "0124")).toBe(false);
    expect(otpMatches("0123", "123")).toBe(false);
    expect(otpMatches("0123", undefined)).toBe(false);
  });
});

describe("weight settlement", () => {
  const pickup = (price) => ({
    price,
    scrapType: "metal",
    items: [{ scrapType: "metal", estimatedWeightKg: 10 }],
  });

  test("within tolerance keeps the agreed price", () => {
    const s = computeSettlement(pickup(500), [{ scrapType: "metal", actualWeightKg: 10.5 }]);
    expect(s.withinTolerance).toBe(true);
    expect(s.finalPrice).toBe(500);
  });
  test("bigger gap proposes a scaled price and needs confirmation", () => {
    const s = computeSettlement(pickup(500), [{ scrapType: "metal", actualWeightKg: 8 }]);
    expect(s.withinTolerance).toBe(false);
    expect(s.proposedPrice).toBe(400);
    expect(s.finalPrice).toBe(400);
  });
  test("scales a negotiated price by the same ratio", () => {
    const s = computeSettlement(pickup(600), [{ scrapType: "metal", actualWeightKg: 15 }]);
    expect(s.proposedPrice).toBe(900);
  });
});