import { describe, test, expect } from "vitest";
import { hasUserRated } from "./ratings";

describe("hasUserRated", () => {
  test("returns false when there are no ratings yet", () => {
    expect(hasUserRated([], "user1")).toBe(false);
  });

  test("returns true when a rating's fromUser matches, as a populated object", () => {
    const ratings = [{ fromUser: { _id: "user1" }, stars: 5 }];
    expect(hasUserRated(ratings, "user1")).toBe(true);
  });

  test("returns true when a rating's fromUser matches, as a plain id string", () => {
    const ratings = [{ fromUser: "user1", stars: 4 }];
    expect(hasUserRated(ratings, "user1")).toBe(true);
  });

  test("returns false when ratings exist but none are from this user", () => {
    const ratings = [{ fromUser: { _id: "someoneElse" }, stars: 5 }];
    expect(hasUserRated(ratings, "user1")).toBe(false);
  });

  test("matches across ObjectId vs string representations of the same id", () => {
    // Mongoose can return an ObjectId-like object whose toString() matches
    // the plain string id — this is the exact mismatch that caused the bug.
    const objectId = { toString: () => "user1" };
    const ratings = [{ fromUser: { _id: objectId }, stars: 3 }];
    expect(hasUserRated(ratings, "user1")).toBe(true);
  });

  test("returns false when userId is missing", () => {
    const ratings = [{ fromUser: "user1", stars: 5 }];
    expect(hasUserRated(ratings, undefined)).toBe(false);
  });

  test("returns false when ratings is not an array", () => {
    expect(hasUserRated(null, "user1")).toBe(false);
    expect(hasUserRated(undefined, "user1")).toBe(false);
  });
});