export type ImportableField = 'date' | 'amount' | 'description';

export interface ColumnMapping {
  csvColumn: string;
  targetField: ImportableField | null;
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; message: string }[];
}

export interface ParsedImportRow {
  date: string | null;
  amount: number | null;
  description: string;
  raw: Record<string, string>;
}
