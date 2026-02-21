import Papa from 'papaparse';
import type { ColumnMapping, ParsedImportRow, ImportableField } from '@/types/import';

export type CsvRow = Record<string, string>;

export interface ParseResult {
  rows: CsvRow[];
  columns: string[];
  detectedMapping: ColumnMapping[];
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (rawResults) => {
        if (rawResults.errors.length > 0) {
          reject(new Error(`CSV parse error: ${rawResults.errors[0]?.message}`));
          return;
        }

        const allRows = rawResults.data;
        if (allRows.length === 0) {
          resolve({ rows: [], columns: [], detectedMapping: [] });
          return;
        }

        const headerIndex = findHeaderRow(allRows);
        const headers = allRows[headerIndex];
        if (!headers) {
          resolve({ rows: [], columns: [], detectedMapping: [] });
          return;
        }

        const dataRows: CsvRow[] = [];
        for (let i = headerIndex + 1; i < allRows.length; i++) {
          const row = allRows[i];
          if (!row || row.length < headers.length - 1) continue;

          const obj: CsvRow = {};
          for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            if (header) {
              obj[header] = row[j] ?? '';
            }
          }
          if (hasValidData(obj)) {
            dataRows.push(obj);
          }
        }

        const columns = headers.filter((h): h is string => Boolean(h));
        const detectedMapping = detectColumnMapping(columns, dataRows);
        resolve({ rows: dataRows, columns, detectedMapping });
      },
      error: (error) => {
        reject(new Error(`CSV parse error: ${error.message}`));
      },
    });
  });
}

function findHeaderRow(rows: string[][]): number {
  let maxColumns = 0;
  let headerIndex = 0;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row) continue;
    const nonEmptyCount = row.filter((cell) => cell && cell.trim().length > 0).length;
    if (nonEmptyCount > maxColumns) {
      maxColumns = nonEmptyCount;
      headerIndex = i;
    }
  }

  return headerIndex;
}

function hasValidData(row: CsvRow): boolean {
  const values = Object.values(row);
  const nonEmptyValues = values.filter((v) => v && v.trim().length > 0);
  return nonEmptyValues.length > 0;
}

function detectColumnMapping(columns: string[], rows: CsvRow[]): ColumnMapping[] {
  return columns.map((col) => ({
    csvColumn: col,
    targetField: detectFieldType(col, rows),
  }));
}

function detectFieldType(column: string, rows: CsvRow[]): ImportableField {
  const sampleValues = rows
    .slice(0, 10)
    .map((row) => row[column])
    .filter((v): v is string => Boolean(v && v.trim()));

  if (sampleValues.length === 0) return 'description';

  const dateScore = scoreDateColumn(sampleValues);
  const amountScore = scoreAmountColumn(sampleValues);

  if (dateScore > 0.7 && dateScore >= amountScore) return 'date';
  if (amountScore > 0.7) return 'amount';

  return 'description';
}

function scoreDateColumn(values: string[]): number {
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\.\d{2}\.\d{4}$/,
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    /^\d{4}\/\d{1,2}\/\d{1,2}$/,
  ];

  let matchCount = 0;
  for (const value of values) {
    const trimmed = value.trim();
    if (datePatterns.some((p) => p.test(trimmed))) {
      matchCount++;
    }
  }

  return values.length > 0 ? matchCount / values.length : 0;
}

function scoreAmountColumn(values: string[]): number {
  const amountPattern = /^[€$£¥]?\s*-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?[€$£¥]?\s*$/;

  let matchCount = 0;
  for (const value of values) {
    const trimmed = value.trim();
    if (amountPattern.test(trimmed)) {
      matchCount++;
    }
  }

  return values.length > 0 ? matchCount / values.length : 0;
}

export function applyMapping(rows: CsvRow[], mapping: ColumnMapping[]): ParsedImportRow[] {
  const dateColumn = mapping.find((m) => m.targetField === 'date')?.csvColumn;
  const amountColumn = mapping.find((m) => m.targetField === 'amount')?.csvColumn;
  const descriptionColumns = mapping
    .filter((m) => m.targetField === null || m.targetField === 'description')
    .map((m) => m.csvColumn);

  return rows.map((row) => {
    const date = dateColumn ? parseDate(row[dateColumn] ?? '') : null;
    const amount = amountColumn ? parseAmount(row[amountColumn] ?? '') : null;

    const descriptionParts: string[] = [];
    for (const col of descriptionColumns) {
      const value = row[col];
      if (value && value.trim()) {
        descriptionParts.push(value.trim());
      }
    }
    const description = descriptionParts.join(' | ');

    return {
      date,
      amount,
      description,
      raw: row,
    };
  });
}

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dmyMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch && mdyMatch[1] && mdyMatch[2] && mdyMatch[3]) {
    const month = mdyMatch[1].padStart(2, '0');
    const day = mdyMatch[2].padStart(2, '0');
    return `${mdyMatch[3]}-${month}-${day}`;
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    return trimmed;
  }

  return null;
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let normalized = trimmed.replace(/\s/g, '');
  normalized = normalized.replace(/[€$£¥]/g, '');
  normalized = normalized.replace(/,/g, '.');

  const lastDotIndex = normalized.lastIndexOf('.');
  if (lastDotIndex > 0) {
    const beforeDecimal = normalized.substring(0, lastDotIndex).replace(/\./g, '');
    const afterDecimal = normalized.substring(lastDotIndex);
    normalized = beforeDecimal + afterDecimal;
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return null;

  return Math.round(parsed * 100);
}
