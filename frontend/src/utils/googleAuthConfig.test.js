import { describe, test, expect } from "vitest";
import { hasGoogleAuth } from "./googleAuthConfig";

describe("hasGoogleAuth", () => {
  // VITE_GOOGLE_CLIENT_ID is unset in the test environment by default, so
  // this locks in the "not configured" default behavior — Google sign-in
  // stays off unless a real client ID is provided.
  test("is false when VITE_GOOGLE_CLIENT_ID is not set", () => {
    expect(hasGoogleAuth).toBe(false);
  });
});