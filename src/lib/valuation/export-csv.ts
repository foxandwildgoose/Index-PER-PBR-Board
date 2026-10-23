const FORMULA = /^[=+@\t\r-]/;

export function protectCsvField(value: string, numeric: boolean): string {
  if (numeric && /^-?\d+(\.\d+)?$/.test(value)) return value;
  const safe = FORMULA.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

export interface ExportTable {
  header: string[];
  rows: string[][];
}

export function tableToCsv(table: ExportTable): string {
  const lines = [table.header.map((h) => protectCsvField(h, false)).join(",")];
  for (const row of table.rows) {
    lines.push(
      row
        .map((cell, i) => {
          const key = table.header[i] ?? "";
          const numeric = key === "value" || key === "percentile" || key === "discount_percent";
          return protectCsvField(cell ?? "", numeric);
        })
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}\n`;
}
