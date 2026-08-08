import { describe, test, expect, vi } from "vitest";

vi.mock("./api", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

import API from "./api";
import { getRatings, submitRating } from "./ratingService";

describe("ratingService", () => {
  test("getRatings requests the ratings for the given pickup", () => {
    getRatings("pickup123");
    expect(API.get).toHaveBeenCalledWith("/pickup/pickup123/rating");
  });

  test("submitRating posts the rating payload to the pickup's rating endpoint", () => {
    const payload = { stars: 4, comment: "Great pickup" };
    submitRating("pickup123", payload);
    expect(API.post).toHaveBeenCalledWith("/pickup/pickup123/rating", payload);
  });
});