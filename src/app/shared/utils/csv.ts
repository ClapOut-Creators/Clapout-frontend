/**
 * Minimal RFC 4180 CSV serialisation + browser download, for admin exports.
 */

/** Byte-order mark: without it Excel misreads UTF-8 currency symbols and names. */
const UTF8_BOM = '\uFEFF';

/**
 * Quotes a single field. Fields containing a quote, comma, or newline must be
 * wrapped in quotes with inner quotes doubled. A leading `=`, `+`, `-` or `@`
 * is prefixed with a tab so spreadsheets treat it as text instead of a formula
 * (CSV injection: exported values come from user-supplied profile fields).
 */
function escapeField(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const guarded = /^[=+\-@]/.test(raw) ? `\t${raw}` : raw;
  return /["\n\r,]/.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

/** Builds a CSV document from a header row and body rows. */
export function toCsv(headers: readonly string[], rows: readonly unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeField).join(',')).join('\r\n');
}

/** Triggers a client-side download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`${UTF8_BOM}${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
