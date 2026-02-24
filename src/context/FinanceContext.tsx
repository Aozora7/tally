import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { db } from '@/db/database';
import { notifyDataMutated } from '@/sync/syncTrigger';
import type {
  TransactionCategory,
  Account,
  TriageTransaction,
  Transaction,
  CategorizationRule,
} from '@/types';

interface FinanceContextValue {
  isLoaded: boolean;
  categories: TransactionCategory[];
  accounts: Account[];
  triageTransactions: TriageTransaction[];
  transactions: Transaction[];
  rules: CategorizationRule[];
  settings: Map<string, string>;
  addCategory: (category: TransactionCategory) => void;
  updateCategory: (category: TransactionCategory) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (categories: TransactionCategory[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
  addTriageTransaction: (transaction: TriageTransaction) => void;
  addTriageTransactions: (transactions: TriageTransaction[]) => void;
  updateTriageTransaction: (transaction: TriageTransaction) => void;
  deleteTriageTransaction: (id: string) => void;
  addTransaction: (transaction: Transaction) => void;
  addTransactions: (transactions: Transaction[]) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addRule: (rule: CategorizationRule) => void;
  updateRule: (rule: CategorizationRule, index: number) => void;
  deleteRule: (id: string) => void;
  reorderRules: (rules: CategorizationRule[]) => void;
  setSetting: (key: string, value: string) => void;
  reloadFromDb: () => Promise<void>;
  clearAllData: () => Promise<void>;
  clearTransactions: () => Promise<void>;
  clearTriageTransactions: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [triageTransactions, setTriageTransactions] = useState<TriageTransaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [settings, setSettings] = useState<Map<string, string>>(new Map());

  const reloadFromDb = useCallback(async () => {
    const [
      loadedCategories,
      loadedAccounts,
      loadedTriage,
      loadedTransactions,
      loadedRules,
      loadedSettings,
    ] = await Promise.all([
      db.categories.toArray(),
      db.accounts.toArray(),
      db.triageTransactions.toArray(),
      db.transactions.toArray(),
      db.rules.toArray(),
      db.settings.toArray(),
    ]);
    setCategories(loadedCategories.sort((a, b) => a.sortOrder - b.sortOrder));
    setAccounts(loadedAccounts);
    setTriageTransactions(loadedTriage);
    setTransactions(loadedTransactions);
    setRules(loadedRules.sort((a, b) => a.sortOrder - b.sortOrder));
    setSettings(new Map(loadedSettings.map((s) => [s.key, s.value])));
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
          [
            db.categories,
            db.accounts,
            db.triageTransactions,
            db.transactions,
            db.rules,
            db.settings,
          ],
          async () => {
            await Promise.all([
              db.categories.bulkPut(categories),
              db.accounts.bulkPut(accounts),
              db.triageTransactions.bulkPut(triageTransactions),
              db.transactions.bulkPut(transactions),
              db.rules.bulkPut(rules),
            ]);
          }
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [categories, accounts, triageTransactions, transactions, rules]);

  const addCategory = useCallback(
    (category: TransactionCategory) => {
      const categoryWithDefaults = {
        ...category,
        sortOrder: categories.length,
        excludeFromReports: category.excludeFromReports ?? false,
      };
      setCategories((prev) => [...prev, categoryWithDefaults]);
      void db.categories.add(categoryWithDefaults);
      notifyDataMutated();
    },
    [categories.length]
  );

  const updateCategory = useCallback((category: TransactionCategory) => {
    setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
    void db.categories.put(category);
    notifyDataMutated();
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    void db.categories.delete(id);
    notifyDataMutated();
  }, []);

  const reorderCategories = useCallback((newCategories: TransactionCategory[]) => {
    const categoriesWithSortOrder = newCategories.map((category, index) => ({
      ...category,
      sortOrder: index,
    }));
    setCategories(categoriesWithSortOrder);
    void db.categories.clear().then(() => db.categories.bulkAdd(categoriesWithSortOrder));
    notifyDataMutated();
  }, []);

  const addAccount = useCallback((account: Account) => {
    setAccounts((prev) => [...prev, account]);
    void db.accounts.add(account);
    notifyDataMutated();
  }, []);

  const updateAccount = useCallback((account: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
    void db.accounts.put(account);
    notifyDataMutated();
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    void db.accounts.delete(id);
    notifyDataMutated();
  }, []);

  const addTriageTransaction = useCallback((transaction: TriageTransaction) => {
    setTriageTransactions((prev) => [...prev, transaction]);
    void db.triageTransactions.add(transaction);
    notifyDataMutated();
  }, []);

  const addTriageTransactions = useCallback((newTransactions: TriageTransaction[]) => {
    setTriageTransactions((prev) => [...prev, ...newTransactions]);
    void db.triageTransactions.bulkAdd(newTransactions);
    notifyDataMutated();
  }, []);

  const updateTriageTransaction = useCallback((transaction: TriageTransaction) => {
    setTriageTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)));
    void db.triageTransactions.put(transaction);
    notifyDataMutated();
  }, []);

  const deleteTriageTransaction = useCallback((id: string) => {
    setTriageTransactions((prev) => prev.filter((t) => t.id !== id));
    void db.triageTransactions.delete(id);
    notifyDataMutated();
  }, []);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => [...prev, transaction]);
    void db.transactions.add(transaction);
    notifyDataMutated();
  }, []);

  const addTransactions = useCallback((newTransactions: Transaction[]) => {
    setTransactions((prev) => [...prev, ...newTransactions]);
    void db.transactions.bulkAdd(newTransactions);
    notifyDataMutated();
  }, []);

  const updateTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)));
    void db.transactions.put(transaction);
    notifyDataMutated();
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    void db.transactions.delete(id);
    notifyDataMutated();
  }, []);

  const addRule = useCallback(
    (rule: CategorizationRule) => {
      const ruleWithSortOrder = { ...rule, sortOrder: rules.length };
      setRules((prev) => [...prev, ruleWithSortOrder]);
      void db.rules.add(ruleWithSortOrder);
      notifyDataMutated();
    },
    [rules.length]
  );

  const updateRule = useCallback((rule: CategorizationRule, index: number) => {
    setRules((prev) => {
      const updated = [...prev];
      updated[index] = rule;
      return updated;
    });
    void db.rules.put(rule);
    notifyDataMutated();
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    void db.rules.delete(id);
    notifyDataMutated();
  }, []);

  const reorderRules = useCallback((newRules: CategorizationRule[]) => {
    const rulesWithSortOrder = newRules.map((rule, index) => ({
      ...rule,
      sortOrder: index,
    }));
    setRules(rulesWithSortOrder);
    void db.rules.clear().then(() => db.rules.bulkAdd(rulesWithSortOrder));
    notifyDataMutated();
  }, []);

  const clearAllData = useCallback(async () => {
    await db.transaction(
      'rw',
      [db.categories, db.accounts, db.triageTransactions, db.transactions, db.rules],
      async () => {
        await Promise.all([
          db.categories.clear(),
          db.accounts.clear(),
          db.triageTransactions.clear(),
          db.transactions.clear(),
          db.rules.clear(),
        ]);
      }
    );
    setCategories([]);
    setAccounts([]);
    setTriageTransactions([]);
    setTransactions([]);
    setRules([]);
    notifyDataMutated();
  }, []);

  const clearTransactions = useCallback(async () => {
    await db.transactions.clear();
    setTransactions([]);
    notifyDataMutated();
  }, []);

  const clearTriageTransactions = useCallback(async () => {
    await db.triageTransactions.clear();
    setTriageTransactions([]);
    notifyDataMutated();
  }, []);

  const setSetting = useCallback((key: string, value: string) => {
    setSettings((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
    void db.settings.put({ key, value });
  }, []);

  return (
    <FinanceContext.Provider
      value={{
        isLoaded,
        categories,
        accounts,
        triageTransactions,
        transactions,
        rules,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        addAccount,
        updateAccount,
        deleteAccount,
        addTriageTransaction,
        addTriageTransactions,
        updateTriageTransaction,
        deleteTriageTransaction,
        addTransaction,
        addTransactions,
        updateTransaction,
        deleteTransaction,
        addRule,
        updateRule,
        deleteRule,
        reorderRules,
        reloadFromDb,
        clearAllData,
        clearTransactions,
        clearTriageTransactions,
        settings,
        setSetting,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
