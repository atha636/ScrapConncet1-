const toCsv = require("../src/utils/toCsv");

describe("toCsv", () => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "note", label: "Note" },
  ];

  test("produces a header row and one row per input, CRLF-joined", () => {
    const csv = toCsv([{ name: "Raj", note: "ok" }], columns);
    expect(csv).toBe("Name,Note\r\nRaj,ok");
  });

  test("quotes and escapes a field containing a comma or quote", () => {
    const csv = toCsv([{ name: 'Ra"j, jr', note: "fine" }], columns);
    expect(csv).toContain('"Ra""j, jr"');
  });

  test("returns an empty string for null/undefined values", () => {
    const csv = toCsv([{ name: null, note: undefined }], columns);
    expect(csv).toBe("Name,Note\r\n,");
  });

  test.each(["=", "+", "-", "@"])(
    "neutralizes a value starting with '%s' by prefixing a single quote",
    (prefix) => {
      const payload = `${prefix}HYPERLINK("http://evil.com","click")`;
      const csv = toCsv([{ name: payload, note: "x" }], columns);
      const dataRow = csv.split("\r\n")[1];
      // The field may also get comma/quote-wrapped by the CSV escaping
      // itself (the payload contains both) — what matters is that the
      // formula-triggering prefix is neutralized with a leading `'`
      // somewhere in the field, not evaluated as a formula by Excel/Sheets.
      expect(dataRow).toContain(`'${prefix}HYPERLINK`);
    }
  );

  test("does not alter a value that merely contains, but doesn't start with, a formula character", () => {
    const csv = toCsv([{ name: "raj-kumar", note: "x" }], columns);
    const dataRow = csv.split("\r\n")[1];
    expect(dataRow.startsWith("raj-kumar")).toBe(true);
  });

  test("resolves dot-path keys against nested objects", () => {
    const csv = toCsv([{ user: { name: "Nested Raj" } }], [{ key: "user.name", label: "Name" }]);
    expect(csv).toBe("Name\r\nNested Raj");
  });
});