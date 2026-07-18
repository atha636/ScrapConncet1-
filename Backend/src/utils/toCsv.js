/**
 * Converts an array of objects into a CSV string.
 *
 * @param {Array<object>} rows
 * @param {Array<{key: string, label: string}>} columns - defines column
 *   order and header text; `key` supports dot-paths (e.g. "user.name").
 */
function toCsv(rows, columns) {
  const escape = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
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