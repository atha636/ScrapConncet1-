/**
 * Triggers a browser download for a blob response (e.g. from a CSV export
 * endpoint). Creates a temporary object URL and a throwaway anchor element
 * — the standard way to force a download from JS without navigating away
 * from the current page.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}