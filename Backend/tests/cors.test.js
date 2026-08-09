const { parseAllowedOrigins, buildCorsOriginCheck } = require("../src/config/cors");

describe("parseAllowedOrigins", () => {
  test("splits a comma-separated list into trimmed origins", () => {
    const result = parseAllowedOrigins("https://a.com, https://b.com,https://c.com");
    expect(result).toEqual(["https://a.com", "https://b.com", "https://c.com"]);
  });

  test("strips trailing slashes so a pasted URL still matches", () => {
    const result = parseAllowedOrigins("https://scrap-conncet1.vercel.app/");
    expect(result).toEqual(["https://scrap-conncet1.vercel.app"]);
  });

  test("returns an empty array for an empty or missing value", () => {
    expect(parseAllowedOrigins("")).toEqual([]);
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });

  test("drops empty entries from stray commas", () => {
    const result = parseAllowedOrigins("https://a.com,,https://b.com,");
    expect(result).toEqual(["https://a.com", "https://b.com"]);
  });
});

describe("buildCorsOriginCheck", () => {
  test("allows a request with no Origin header (curl, health checks, server-to-server)", (done) => {
    const check = buildCorsOriginCheck("https://a.com", { logRejections: false });
    check(undefined, (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });

  test("allows an origin that's in the list", (done) => {
    const check = buildCorsOriginCheck("https://a.com,https://b.com", { logRejections: false });
    check("https://b.com", (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });

  test("allows an origin even when CLIENT_ORIGIN has a trailing slash", (done) => {
    const check = buildCorsOriginCheck("https://scrap-conncet1.vercel.app/", { logRejections: false });
    check("https://scrap-conncet1.vercel.app", (err, allowed) => {
      expect(err).toBeNull();
      expect(allowed).toBe(true);
      done();
    });
  });

  test("rejects an origin that's not in the list", (done) => {
    const check = buildCorsOriginCheck("https://a.com", { logRejections: false });
    check("https://evil.com", (err, allowed) => {
      expect(err).toBeInstanceOf(Error);
      expect(allowed).toBeUndefined();
      done();
    });
  });
});