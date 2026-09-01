import { describe, test, expect } from "vitest";
import { encodeLocationMessage, parseLocationMessage } from "./chatLocation";

describe("encodeLocationMessage / parseLocationMessage", () => {
  test("round-trips a positive coordinate pair", () => {
    const encoded = encodeLocationMessage(30.7333, 76.7794);
    const parsed = parseLocationMessage(encoded);
    expect(parsed).toEqual({
      lat: 30.7333,
      lng: 76.7794,
      mapsUrl: "https://www.google.com/maps?q=30.7333,76.7794",
    });
  });

  test("round-trips negative coordinates", () => {
    const encoded = encodeLocationMessage(-33.8688, -151.2093);
    const parsed = parseLocationMessage(encoded);
    expect(parsed.lat).toBe(-33.8688);
    expect(parsed.lng).toBe(-151.2093);
  });

  test("round-trips integer coordinates with no decimal part", () => {
    const encoded = encodeLocationMessage(0, 0);
    const parsed = parseLocationMessage(encoded);
    expect(parsed).toEqual({ lat: 0, lng: 0, mapsUrl: "https://www.google.com/maps?q=0,0" });
  });

  test("produces a real, clickable Google Maps URL", () => {
    const encoded = encodeLocationMessage(28.6139, 77.209);
    expect(encoded).toContain("https://www.google.com/maps?q=28.6139,77.209");
  });

  test("returns null for an ordinary chat message", () => {
    expect(parseLocationMessage("On my way, 5 mins!")).toBeNull();
  });

  test("returns null for empty or undefined text", () => {
    expect(parseLocationMessage("")).toBeNull();
    expect(parseLocationMessage(undefined)).toBeNull();
  });

  test("returns null for text that merely mentions location without the exact prefix", () => {
    expect(parseLocationMessage("Live location: not actually formatted right")).toBeNull();
  });
});