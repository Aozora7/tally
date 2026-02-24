import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { db } from '@/db/database';
import { notifyDataMutated } from '@/sync/syncTrigger';
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
        void db.transaction(
          'rw',
          [db.securities, db.securityTransactions, db.securityPriceCache],
          async () => {
            await Promise.all([
              db.securities.bulkPut(securities),
              db.securityTransactions.bulkPut(securityTransactions),
              db.securityPriceCache.bulkPut(securityPriceCache),
            ]);
          }
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [securities, securityTransactions, securityPriceCache]);

  const addSecurity = useCallback((security: Security) => {
    setSecurities((prev) => [...prev, security]);
    void db.securities.add(security);
    notifyDataMutated();
  }, []);

  const addSecurities = useCallback((newSecurities: Security[]) => {
    setSecurities((prev) => [...prev, ...newSecurities]);
    void db.securities.bulkAdd(newSecurities);
    notifyDataMutated();
  }, []);

  const updateSecurity = useCallback((security: Security) => {
    setSecurities((prev) => prev.map((s) => (s.id === security.id ? security : s)));
    void db.securities.put(security);
    notifyDataMutated();
  }, []);

  const deleteSecurity = useCallback((id: string) => {
    setSecurities((prev) => prev.filter((s) => s.id !== id));
    void db.securities.delete(id);
    notifyDataMutated();
  }, []);

  const addSecurityTransaction = useCallback((transaction: SecurityTransaction) => {
    setSecurityTransactions((prev) => [...prev, transaction]);
    void db.securityTransactions.add(transaction);
    notifyDataMutated();
  }, []);

  const addSecurityTransactions = useCallback((newTransactions: SecurityTransaction[]) => {
    setSecurityTransactions((prev) => [...prev, ...newTransactions]);
    void db.securityTransactions.bulkAdd(newTransactions);
    notifyDataMutated();
  }, []);

  const updateSecurityTransaction = useCallback((transaction: SecurityTransaction) => {
    setSecurityTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)));
    void db.securityTransactions.put(transaction);
    notifyDataMutated();
  }, []);

  const deleteSecurityTransaction = useCallback((id: string) => {
    setSecurityTransactions((prev) => prev.filter((t) => t.id !== id));
    void db.securityTransactions.delete(id);
    notifyDataMutated();
  }, []);

  const setSecurityPriceEntries = useCallback((entries: SecurityPriceCache[]) => {
    setSecurityPriceCache((prev) => {
      const map = new Map(prev.map((e) => [e.id, e]));
      for (const entry of entries) {
        map.set(entry.id, entry);
      }
      return Array.from(map.values());
    });
    void db.securityPriceCache.bulkPut(entries);
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
