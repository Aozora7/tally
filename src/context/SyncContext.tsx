import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useFinance } from './FinanceContext';
import { useSecurities } from './SecuritiesContext';
import { onDataMutated } from '@/sync/syncTrigger';
import { getValidAccessToken, isOAuthConfigured } from '@/sync/oauthFlow';
import { performSync, checkRemoteState, resetCachedFileId } from '@/sync/syncEngine';
import { importFullState } from '@/db/import';
import { db } from '@/db/database';
import type { ExportedState } from '@/db/export';

export type SyncStatus = 'not-configured' | 'idle' | 'syncing' | 'synced' | 'error';

interface SyncContextValue {
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncNow: () => Promise<void>;
  isConfigured: boolean;
  remoteNewer: boolean;
  acceptRemote: () => Promise<void>;
  dismissRemote: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const DEBOUNCE_MS = 5_000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { settings, setSetting, reloadFromDb: reloadFinance } = useFinance();
  const { reloadFromDb: reloadSecurities } = useSecurities();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('not-configured');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [remoteNewer, setRemoteNewer] = useState(false);
  const [remoteData, setRemoteData] = useState<ExportedState | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const configured = isOAuthConfigured(settings);

  const doSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (!isOAuthConfigured(settingsRef.current)) return;

    isSyncingRef.current = true;
    setSyncStatus('syncing');
    setLastError(null);

    try {
      const accessToken = await getValidAccessToken(settingsRef.current, setSetting);
      await performSync(accessToken, settingsRef.current, setSetting);
      const syncedAt = new Date().toISOString();
      setLastSyncedAt(syncedAt);
      setSyncStatus('synced');

      // Fade back to idle after 10s
      setTimeout(() => {
        setSyncStatus((prev) => (prev === 'synced' ? 'idle' : prev));
      }, 10_000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      setLastError(message);
      setSyncStatus('error');

      // If token error, reset cached file ID so next attempt re-lists
      if (message.includes('Token') || message.includes('401')) {
        resetCachedFileId();
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [setSetting]);

  const syncNow = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    await doSync();
  }, [doSync]);

  const acceptRemote = useCallback(async () => {
    if (!remoteData) return;
    try {
      await importFullState(remoteData);
      await reloadFinance();
      await reloadSecurities();
      setRemoteNewer(false);
      setRemoteData(null);
      setSyncStatus('idle');
      setLastSyncedAt(remoteData.exportedAt);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Failed to import remote data');
      setSyncStatus('error');
    }
  }, [remoteData, reloadFinance, reloadSecurities]);

  const dismissRemote = useCallback(() => {
    setRemoteNewer(false);
    setRemoteData(null);
  }, []);

  // Subscribe to mutation notifications
  useEffect(() => {
    if (!configured) {
      setSyncStatus('not-configured');
      return;
    }

    setSyncStatus('idle');

    const unsubscribe = onDataMutated(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void doSync();
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [configured, doSync]);

  // Sync on visibility hidden
  useEffect(() => {
    if (!configured) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && !isSyncingRef.current) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        void doSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [configured, doSync]);

  // Startup: check remote state
  useEffect(() => {
    if (!configured) return;

    let cancelled = false;

    async function isLocalEmpty(): Promise<boolean> {
      const [catCount, accCount, txCount, triageCount, ruleCount, secCount] = await Promise.all([
        db.categories.count(),
        db.accounts.count(),
        db.transactions.count(),
        db.triageTransactions.count(),
        db.rules.count(),
        db.securities.count(),
      ]);
      return catCount + accCount + txCount + triageCount + ruleCount + secCount === 0;
    }

    async function checkStartup() {
      try {
        const accessToken = await getValidAccessToken(settingsRef.current, setSetting);
        const remote = await checkRemoteState(accessToken);

        if (cancelled) return;

        if (remote) {
          const localEmpty = await isLocalEmpty();
          if (localEmpty) {
            // Fresh install with remote data available — auto-import silently
            await importFullState(remote.data);
            await reloadFinance();
            await reloadSecurities();
            setSetting('lastSyncedAt', remote.exportedAt);
            setLastSyncedAt(remote.exportedAt);
            setSyncStatus('idle');
            return;
          }

          const localSyncedAt = settingsRef.current.get('lastSyncedAt');
          if (localSyncedAt && remote.exportedAt > localSyncedAt) {
            setRemoteNewer(true);
            setRemoteData(remote.data);
          } else {
            setLastSyncedAt(localSyncedAt || null);
          }
          setSyncStatus('idle');
        } else {
          // No remote data, do initial sync
          setSyncStatus('idle');
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Startup check failed';
        setLastError(message);
        setSyncStatus('error');
      }
    }

    void checkStartup();
    return () => {
      cancelled = true;
    };
  }, [configured, setSetting]);

  // Update lastSyncedAt from settings on load
  useEffect(() => {
    const stored = settings.get('lastSyncedAt');
    if (stored) setLastSyncedAt(stored);
  }, [settings]);

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        lastSyncedAt,
        lastError,
        syncNow,
        isConfigured: configured,
        remoteNewer,
        acceptRemote,
        dismissRemote,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
