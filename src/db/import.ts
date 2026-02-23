import { db } from './database';
import type { ExportedState } from './export';

export async function importFullState(data: ExportedState): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.categories,
      db.accounts,
      db.triageTransactions,
      db.transactions,
      db.rules,
      db.securities,
      db.securityTransactions,
      db.securityPriceCache,
    ],
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.accounts.clear(),
        db.triageTransactions.clear(),
        db.transactions.clear(),
        db.rules.clear(),
        db.securities.clear(),
        db.securityTransactions.clear(),
        db.securityPriceCache.clear(),
      ]);

      await Promise.all([
        db.categories.bulkAdd(data.categories),
        db.accounts.bulkAdd(data.accounts),
        db.triageTransactions.bulkAdd(data.triageTransactions),
        db.transactions.bulkAdd(data.transactions),
        db.rules.bulkAdd(data.rules),
        db.securities.bulkAdd(data.securities ?? []),
        db.securityTransactions.bulkAdd(data.securityTransactions ?? []),
        db.securityPriceCache.bulkAdd(data.securityPriceCache ?? []),
      ]);
    }
  );
}

export function parseImportFile(file: File): Promise<ExportedState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as ExportedState;

        if (!data.version || !data.exportedAt) {
          throw new Error('Invalid backup file format');
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
