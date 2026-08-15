import { describe, test, expect } from "vitest";
import { roleHome, ROLE_HOME } from "./roleHome";

describe("roleHome", () => {
  test("returns the collector dashboard for role 'collector'", () => {
    expect(roleHome("collector")).toBe("/collector");
  });

  test("returns the admin panel for role 'admin'", () => {
    expect(roleHome("admin")).toBe("/admin");
  });

  test("returns the user dashboard for role 'user'", () => {
    expect(roleHome("user")).toBe("/dashboard");
  });

  test("falls back to the user dashboard for an unrecognized role", () => {
    expect(roleHome("something-unexpected")).toBe("/dashboard");
  });

  test("falls back to the user dashboard when role is missing", () => {
    expect(roleHome(undefined)).toBe("/dashboard");
    expect(roleHome(null)).toBe("/dashboard");
  });

  test("ROLE_HOME contains exactly the three known roles", () => {
    expect(Object.keys(ROLE_HOME).sort()).toEqual(["admin", "collector", "user"]);
  });
});