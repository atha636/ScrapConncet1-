import { describe, expect, test } from "vitest";
import { translate } from "./core";
import en from "./locales/en";
import hi from "./locales/hi";
import pa from "./locales/pa";

// Every leaf key path in an object, e.g. "nav.home".
function paths(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" ? paths(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}
// {placeholder} names used in a string.
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const get = (o, p) => p.split(".").reduce((x, k) => x?.[k], o);

describe("translations", () => {
  const keys = paths(en);

  test.each([["hi", hi], ["pa", pa]])("%s covers every English key", (_, dict) => {
    const missing = keys.filter((k) => typeof get(dict, k) !== "string");
    expect(missing).toEqual([]);
  });

  test.each([["hi", hi], ["pa", pa]])("%s has no keys English lacks", (_, dict) => {
    const extra = paths(dict).filter((k) => typeof get(en, k) !== "string");
    expect(extra).toEqual([]);
  });

  test.each([["hi", hi], ["pa", pa]])("%s keeps the same {placeholders}", (_, dict) => {
    const bad = keys.filter((k) => placeholders(get(en, k)) !== placeholders(get(dict, k)));
    expect(bad).toEqual([]);
  });

  test("interpolates and falls back", () => {
    expect(translate("en", "scrap.moreItems", { first: "Metal", n: 2 })).toBe("Metal + 2 more");
    expect(translate("hi", "nav.home")).toBe("होम");
    expect(translate("pa", "does.not.exist")).toBe("does.not.exist");
  });
});