import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { db } from '@/db/database';
import { notifyDataMutated } from '@/sync/syncTrigger';
import { fireAndForget } from '@/utils/dbHelpers';
import type { Security, SecurityTransaction, SecurityPriceCache } from '@/types';
import { fetchMonthlyPrices, fetchCurrentPrice } from '@/utils/yahooFinance';

interface SecuritiesContextValue {
  isLoaded: boolean;
  securities: Security[];
  securityTransactions: SecurityTransaction[];
  securityPriceCache: SecurityPriceCache[];
  addSecurity: (security: Security) => void;
  addSecurities: (securities: Security[]) => void;
  updateSecurity: (security: Security) => void;
  deleteSecurity: (id: string) => void;
  addSecurityTransaction: (transaction: SecurityTransaction) => void;
  addSecurityTransactions: (transactions: SecurityTransaction[]) => void;
  updateSecurityTransaction: (transaction: SecurityTransaction) => void;
  deleteSecurityTransaction: (id: string) => void;
  setSecurityPriceEntries: (entries: SecurityPriceCache[]) => void;
  fetchAndCachePrices: (
    securityId: string,
    ticker: string,
    startDate: string,
    endDate: string
  ) => Promise<void>;
  fetchAndCacheCurrentPrice: (securityId: string, ticker: string) => Promise<void>;
  reloadFromDb: () => Promise<void>;
}

const SecuritiesContext = createContext<SecuritiesContextValue | null>(null);

export function SecuritiesProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [securities, setSecurities] = useState<Security[]>([]);
  const [securityTransactions, setSecurityTransactions] = useState<SecurityTransaction[]>([]);
  const [securityPriceCache, setSecurityPriceCache] = useState<SecurityPriceCache[]>([]);

  const reloadFromDb = useCallback(async () => {
    const [loadedSecurities, loadedTransactions, loadedPriceCache] = await Promise.all([
      db.securities.toArray(),
      db.securityTransactions.toArray(),
      db.securityPriceCache.toArray(),
    ]);
    setSecurities(loadedSecurities);
    setSecurityTransactions(loadedTransactions);
    setSecurityPriceCache(loadedPriceCache);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    void reloadFromDb();
  }, [reloadFromDb]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        fireAndForget(
          db.transaction(
            'rw',
            [db.securities, db.securityTransactions, db.securityPriceCache],
            async () => {
              await Promise.all([
                db.securities.bulkPut(securities),
                db.securityTransactions.bulkPut(securityTransactions),
                db.securityPriceCache.bulkPut(securityPriceCache),
              ]);
            }
          ),
          'visibility-change securities bulk persist'
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [securities, securityTransactions, securityPriceCache]);

  const addSecurity = useCallback((security: Security) => {
    setSecurities((prev) => [...prev, security]);
    fireAndForget(db.securities.add(security), 'add security');
    notifyDataMutated();
  }, []);

  const addSecurities = useCallback((newSecurities: Security[]) => {
    setSecurities((prev) => [...prev, ...newSecurities]);
    fireAndForget(db.securities.bulkAdd(newSecurities), 'bulk add securities');
    notifyDataMutated();
  }, []);

  const updateSecurity = useCallback((security: Security) => {
    setSecurities((prev) => prev.map((s) => (s.id === security.id ? security : s)));
    fireAndForget(db.securities.put(security), 'update security');
    notifyDataMutated();
  }, []);

  const deleteSecurity = useCallback((id: string) => {
    setSecurities((prev) => prev.filter((s) => s.id !== id));
    fireAndForget(db.securities.delete(id), 'delete security');
    notifyDataMutated();
  }, []);

  const addSecurityTransaction = useCallback((transaction: SecurityTransaction) => {
    setSecurityTransactions((prev) => [...prev, transaction]);
    fireAndForget(db.securityTransactions.add(transaction), 'add security transaction');
    notifyDataMutated();
  }, []);

  const addSecurityTransactions = useCallback((newTransactions: SecurityTransaction[]) => {
    setSecurityTransactions((prev) => [...prev, ...newTransactions]);
    fireAndForget(
      db.securityTransactions.bulkAdd(newTransactions),
      'bulk add security transactions'
    );
    notifyDataMutated();
  }, []);

  const updateSecurityTransaction = useCallback((transaction: SecurityTransaction) => {
    setSecurityTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)));
    fireAndForget(db.securityTransactions.put(transaction), 'update security transaction');
    notifyDataMutated();
  }, []);

  const deleteSecurityTransaction = useCallback((id: string) => {
    setSecurityTransactions((prev) => prev.filter((t) => t.id !== id));
    fireAndForget(db.securityTransactions.delete(id), 'delete security transaction');
    notifyDataMutated();
  }, []);

  const setSecurityPriceEntries = useCallback((entries: SecurityPriceCache[]) => {
    setSecurityPriceCache((prev) => {
      const map = new Map(prev.map((e) => [e.id, e]));
      for (const entry of entries) {
        const existing = map.get(entry.id);
        if (entry.final) {
          map.set(entry.id, entry);
        } else if (!existing) {
          map.set(entry.id, entry);
        } else if (!existing.final) {
          map.set(entry.id, entry);
        }
      }
      return Array.from(map.values());
    });
    fireAndForget(db.securityPriceCache.bulkPut(entries), 'bulk put security price cache');
    notifyDataMutated();
  }, []);

  const fetchAndCachePrices = useCallback(
    async (securityId: string, ticker: string, startDate: string, endDate: string) => {
      const monthlyPrices = await fetchMonthlyPrices(ticker, startDate, endDate);
      const entries: SecurityPriceCache[] = monthlyPrices.map((mp) => ({
        id: `${securityId}_${mp.yearMonth}`,
        securityId,
        yearMonth: mp.yearMonth,
        price: mp.price,
        final: true,
      }));
      setSecurityPriceEntries(entries);
    },
    [setSecurityPriceEntries]
  );

  const fetchAndCacheCurrentPrice = useCallback(
    async (securityId: string, ticker: string) => {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { price } = await fetchCurrentPrice(ticker);
      const entry: SecurityPriceCache = {
        id: `${securityId}_${yearMonth}`,
        securityId,
        yearMonth,
        price,
        final: false,
      };
      setSecurityPriceEntries([entry]);
    },
    [setSecurityPriceEntries]
  );

  return (
    <SecuritiesContext.Provider
      value={{
        isLoaded,
        securities,
        securityTransactions,
        securityPriceCache,
        addSecurity,
        addSecurities,
        updateSecurity,
        deleteSecurity,
        addSecurityTransaction,
        addSecurityTransactions,
        updateSecurityTransaction,
        deleteSecurityTransaction,
        setSecurityPriceEntries,
        fetchAndCachePrices,
        fetchAndCacheCurrentPrice,
        reloadFromDb,
      }}
    >
      {children}
    </SecuritiesContext.Provider>
  );
}

export function useSecurities(): SecuritiesContextValue {
  const context = useContext(SecuritiesContext);
  if (!context) {
    throw new Error('useSecurities must be used within a SecuritiesProvider');
  }
  return context;
}
