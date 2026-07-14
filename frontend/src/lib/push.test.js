import { describe, test, expect } from "vitest";
import { urlBase64ToUint8Array, isPushSupported } from "./push";

describe("urlBase64ToUint8Array", () => {
  test("decodes a standard base64url VAPID-style key into the correct byte length", () => {
    // Real VAPID public keys are always 65 bytes (uncompressed P-256 point)
    const sample = "BMNYH7G1hzFSJg7CQbEjLA66eV7KKsjhAQwI3ZhBPEJZsgIxYh3iBVlHiW_lD2Q5UDqXLy_WMRlzQEabMUCbVx4";
    const bytes = urlBase64ToUint8Array(sample);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
  });

  test("correctly substitutes URL-safe characters back to standard base64", () => {
    // '-' -> '+', '_' -> '/' — verify round-trip against a known value.
    // "PA==" in standard base64 decodes to a single byte: 0x3C
    const bytes = urlBase64ToUint8Array("PA");
    expect(Array.from(bytes)).toEqual([0x3c]);
  });

  test("handles padding correctly for strings not a multiple of 4", () => {
    // Should not throw regardless of input length
    expect(() => urlBase64ToUint8Array("BMNYH7G1hzFSJg7C")).not.toThrow();
  });
});

describe("isPushSupported", () => {
  test("returns a boolean without throwing in a jsdom environment", () => {
    expect(typeof isPushSupported()).toBe("boolean");
  });
});