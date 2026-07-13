function escapeCsvField(field: string): string {
  if (/[",\n\r]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/** Joins rows into an RFC 4180-style CSV string — CRLF line endings, fields containing a
 * comma/quote/newline quoted with internal quotes doubled. */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}
