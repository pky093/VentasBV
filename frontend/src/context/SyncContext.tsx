/**
 * SyncContext — React Context for offline sync state management
 * 
 * Provides:
 * - isOnline: boolean — current network status
 * - isSyncing: boolean — whether a sync operation is in progress
 * - pendingCount: number — number of offline mutations awaiting sync
 * - lastSyncDate: string | null — last successful sync timestamp
 * - syncProgress: number — 0-100 progress indicator
 * - triggerSync(): void — manual sync trigger
 * - downloadOfflineData(): void — manual pull trigger
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  type SyncState,
  subscribeSyncState,
  initSyncEngine,
  destroyNetworkListeners,
  triggerFullSync,
  pullAllData,
  refreshPendingCount,
} from '../lib/sync-engine';

interface SyncContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncDate: string | null;
  syncProgress: number;
  errorMessage?: string;
  triggerSync: () => Promise<void>;
  downloadOfflineData: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncDate: null,
  syncProgress: 0,
  triggerSync: async () => {},
  downloadOfflineData: async () => {},
});

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    status: 'online',
    pendingCount: 0,
    lastPullDate: null,
    lastPushDate: null,
    syncProgress: 0,
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Subscribe to state changes from the sync engine
    const unsub = subscribeSyncState((newState) => {
      setState(newState);
    });

    // Initialize the sync engine (network listeners + initial pull)
    initSyncEngine().catch(console.error);

    return () => {
      unsub();
      destroyNetworkListeners();
    };
  }, []);

  const triggerSync = useCallback(async () => {
    try {
      await triggerFullSync();
    } catch (err) {
      console.error('[SyncProvider] triggerSync error:', err);
    }
  }, []);

  const downloadOfflineData = useCallback(async () => {
    try {
      await pullAllData();
    } catch (err) {
      console.error('[SyncProvider] downloadOfflineData error:', err);
    }
  }, []);

  // Periodically refresh pending count
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPendingCount().catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const value: SyncContextValue = {
    isOnline: state.isOnline,
    isSyncing: state.status === 'syncing',
    pendingCount: state.pendingCount,
    lastSyncDate: state.lastPullDate || state.lastPushDate,
    syncProgress: state.syncProgress,
    errorMessage: state.errorMessage,
    triggerSync,
    downloadOfflineData,
  };

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  return useContext(SyncContext);
}
