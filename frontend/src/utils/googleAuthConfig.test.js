import { describe, test, expect } from "vitest";
import { hasGoogleAuth } from "./googleAuthConfig";

describe("hasGoogleAuth", () => {
  // Whether Google sign-in is "on" depends on each environment's own
  // VITE_GOOGLE_CLIENT_ID — a dev machine with it configured should see
  // true, one without it should see false. Rather than hardcoding an
  // expected outcome (which broke the moment this ran somewhere Google
  // sign-in was actually set up), this checks the actual contract: the
  // flag is a real boolean, and it agrees with whatever the env var
  // currently is.
  test("is a boolean that reflects whether VITE_GOOGLE_CLIENT_ID is set", () => {
    expect(typeof hasGoogleAuth).toBe("boolean");
    expect(hasGoogleAuth).toBe(Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID));
  });
});