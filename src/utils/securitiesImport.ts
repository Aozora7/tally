import Papa from 'papaparse';
import type { Security, SecurityTransaction, SecurityTransactionType } from '@/types';
import { generateId } from '@/utils/uuid';
import { displayToUnits, displayToPrice } from '@/utils/securities';
import { displayToCents } from '@/utils/currency';

interface RawSecuritiesRow {
  Date: string;
  Type: string;
  Stock: string;
  Units: string;
  Price: string;
  Fees: string;
}

export interface SecuritiesImportResult {
  securities: Security[];
  transactions: SecurityTransaction[];
  errors: string[];
}

function parseDate(value: string): string {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;
  const dmyMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }
  return trimmed;
}

function parseTransactionType(value: string): SecurityTransactionType | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'buy') return 'Buy';
  if (normalized === 'sell') return 'Sell';
  return null;
}

export function parseSecuritiesCsv(
  content: string,
  existingSecurities: Security[]
): SecuritiesImportResult {
  const result: SecuritiesImportResult = {
    securities: [],
    transactions: [],
    errors: [],
  };

  const parseResult = Papa.parse<RawSecuritiesRow>(content, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    result.errors.push(`Parse error: ${parseResult.errors[0]?.message}`);
    return result;
  }

  const securityMap = new Map<string, Security>();
  for (const sec of existingSecurities) {
    securityMap.set(sec.ticker, sec);
  }

  for (const row of parseResult.data) {
    const lineNum = parseResult.data.indexOf(row) + 2;

    if (!row.Date || !row.Type || !row.Stock || !row.Units || !row.Price) {
      result.errors.push(`Line ${lineNum}: Missing required fields`);
      continue;
    }

    const type = parseTransactionType(row.Type);
    if (!type) {
      result.errors.push(`Line ${lineNum}: Invalid type "${row.Type}" (must be Buy or Sell)`);
      continue;
    }

    const date = parseDate(row.Date);
    const ticker = row.Stock.trim();
    const units = displayToUnits(row.Units);
    const price = displayToPrice(row.Price);
    const fees = displayToCents(row.Fees || '0');

    let security = securityMap.get(ticker);
    if (!security) {
      security = {
        id: generateId(),
        ticker,
      };
      securityMap.set(ticker, security);
      result.securities.push(security);
    }

    const transaction: SecurityTransaction = {
      id: generateId(),
      date,
      type,
      securityId: security.id,
      units,
      pricePerUnit: price,
      fees,
    };

    result.transactions.push(transaction);
  }

  return result;
}
