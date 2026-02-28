import { db } from './database';
import { filterBackupSettings, SENSITIVE_SETTING_KEYS, type ExportedState } from './export';

export async function importFullState(data: ExportedState): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.categories,
      db.accounts,
      db.triageTransactions,
      db.transactions,
      db.rules,
      db.settings,
      db.securities,
      db.securityTransactions,
      db.securityPriceCache,
    ],
    async () => {
      const sensitiveSettingsToPreserve = await db.settings
        .where('key')
        .anyOf([...SENSITIVE_SETTING_KEYS])
        .toArray();
      const importedSettings = filterBackupSettings(data.settings ?? []);

      await Promise.all([
        db.categories.clear(),
        db.accounts.clear(),
        db.triageTransactions.clear(),
        db.transactions.clear(),
        db.rules.clear(),
        db.settings.clear(),
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
        db.settings.bulkAdd([...importedSettings, ...sensitiveSettingsToPreserve]),
        db.securities.bulkAdd(data.securities ?? []),
        db.securityTransactions.bulkAdd(data.securityTransactions ?? []),
        db.securityPriceCache.bulkAdd(data.securityPriceCache ?? []),
      ]);
    }
  );
}
