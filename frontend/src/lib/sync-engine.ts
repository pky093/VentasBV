/**
 * Sync Engine for VentasBV Offline-First Architecture
 * 
 * Handles:
 * - Network status detection (online/offline)
 * - Pull: Download all data from Supabase → IndexedDB on startup
 * - Push: Upload pending mutations from IndexedDB outbox → Supabase on reconnection
 * - Event-based notifications for UI components
 */

import { supabase, getActiveTenantId, getActiveBranchId } from './supabase';
import {
  STORES,
  type StoreName,
  getAllRecords,
  replaceAllRecords,
  putManyRecords,
  getPendingMutations,
  removeMutation,
  updateMutationStatus,
  getPendingCount,
  setSyncMeta,
  getSyncMeta,
  type OutboxMutation,
} from './offline-db';

// ─── Types ──────────────────────────────────────────────────────

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

export interface SyncState {
  isOnline: boolean;
  status: SyncStatus;
  pendingCount: number;
  lastPullDate: string | null;
  lastPushDate: string | null;
  syncProgress: number; // 0-100
  errorMessage?: string;
}

type SyncListener = (state: SyncState) => void;

// ─── State ──────────────────────────────────────────────────────

let currentState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  status: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  pendingCount: 0,
  lastPullDate: null,
  lastPushDate: null,
  syncProgress: 0,
};

const listeners = new Set<SyncListener>();

function notifyListeners() {
  for (const listener of listeners) {
    try { listener({ ...currentState }); } catch (_) { /* ignore */ }
  }
}

function updateState(partial: Partial<SyncState>) {
  currentState = { ...currentState, ...partial };
  notifyListeners();
}

// ─── Public API ────────────────────────────────────────────────

/** Subscribe to sync state changes */
export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  // Immediately call with current state
  listener({ ...currentState });
  return () => { listeners.delete(listener); };
}

/** Get current sync state snapshot */
export function getSyncState(): SyncState {
  return { ...currentState };
}

/** Check if network is currently available */
export function isNetworkOnline(): boolean {
  return currentState.isOnline;
}

// ─── Network Detection ─────────────────────────────────────────

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/** Check actual connectivity by pinging Supabase */
async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://bpsqdubdxcklbyninvjg.supabase.co'}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwc3FkdWJkeGNrbGJ5bmludmpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MTU4MTksImV4cCI6MjEwMjQ5MTgxOX0.uDZ5CaDz5EirbM3_e_pAGdPmqeGLmTn0uF9Q8h-AwKk',
      },
    });
    clearTimeout(timeout);
    return response.ok || response.status === 400 || response.status === 401;
  } catch {
    return false;
  }
}

function handleOnline() {
  updateState({ isOnline: true, status: 'online' });
  // Auto-push any pending mutations
  pushPendingMutations().catch(console.error);
}

function handleOffline() {
  updateState({ isOnline: false, status: 'offline' });
}

/** Initialize network listeners */
export function initNetworkListeners() {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Periodic heartbeat check every 30s
  heartbeatInterval = setInterval(async () => {
    const reallyOnline = await checkConnectivity();
    if (reallyOnline !== currentState.isOnline) {
      if (reallyOnline) {
        handleOnline();
      } else {
        handleOffline();
      }
    }
  }, 30_000);

  // Initial connectivity check
  checkConnectivity().then((online) => {
    updateState({
      isOnline: online,
      status: online ? 'online' : 'offline',
    });
  });
}

/** Cleanup listeners */
export function destroyNetworkListeners() {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ─── PULL: Download all data from Supabase → IndexedDB ─────────

interface PullTableConfig {
  storeName: StoreName;
  tableName: string;
  select?: string;
  filterTenant?: boolean;
}

const PULL_TABLES: PullTableConfig[] = [
  { storeName: STORES.PRODUCTS, tableName: 'products', select: 'id, code, sku, name, price, cost, min_stock, status, category_id, brand_id, model_id, image_path, colors, tenant_id, created_at', filterTenant: true },
  { storeName: STORES.BRANCH_INVENTORY, tableName: 'branch_inventory', select: 'id, tenant_id, branch_id, product_id, quantity', filterTenant: true },
  { storeName: STORES.CATEGORIES, tableName: 'categories', select: 'id, name, active, tenant_id', filterTenant: true },
  { storeName: STORES.BRANDS, tableName: 'brands', select: 'id, name, category_id, active, tenant_id', filterTenant: true },
  { storeName: STORES.MODELS, tableName: 'models', select: 'id, name, brand_id, active, tenant_id', filterTenant: true },
  { storeName: STORES.CUSTOMERS, tableName: 'customers', select: '*', filterTenant: true },
  { storeName: STORES.SUPPLIERS, tableName: 'suppliers', select: '*', filterTenant: true },
  { storeName: STORES.SALES, tableName: 'sales', select: '*', filterTenant: true },
  { storeName: STORES.SALE_ITEMS, tableName: 'sale_items', select: '*', filterTenant: true },
  { storeName: STORES.CREDITS, tableName: 'credits', select: '*', filterTenant: true },
  { storeName: STORES.CREDIT_INSTALLMENTS, tableName: 'credit_installments', select: '*', filterTenant: true },
  { storeName: STORES.EXPENSES, tableName: 'expenses', select: '*', filterTenant: true },
  { storeName: STORES.BRANCHES, tableName: 'branches', select: 'id, name, address, phone, manager_name, status, is_main, tenant_id', filterTenant: true },
];

/**
 * Pull all data from Supabase into IndexedDB.
 * This downloads every table and replaces the local cache.
 */
export async function pullAllData(): Promise<boolean> {
  const tenantId = getActiveTenantId();
  if (!tenantId) {
    console.warn('[SyncEngine] No active tenant, skipping pull.');
    return false;
  }

  if (!currentState.isOnline) {
    console.warn('[SyncEngine] Offline, skipping pull.');
    return false;
  }

  updateState({ status: 'syncing', syncProgress: 0 });

  try {
    const totalTables = PULL_TABLES.length;
    let completedTables = 0;

    for (const config of PULL_TABLES) {
      try {
        let query = supabase.from(config.tableName).select(config.select || '*');

        if (config.filterTenant) {
          query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`[SyncEngine] Error pulling ${config.tableName}:`, error);
        } else if (data) {
          await replaceAllRecords(config.storeName, data);
        }
      } catch (tableError) {
        console.error(`[SyncEngine] Exception pulling ${config.tableName}:`, tableError);
      }

      completedTables++;
      updateState({ syncProgress: Math.round((completedTables / totalTables) * 100) });
    }

    // Also pull settings (tenant info)
    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantData) {
        await replaceAllRecords(STORES.SETTINGS, [{ key: 'tenant_info', ...tenantData }]);
      }
    } catch { /* non-critical */ }

    const now = new Date().toISOString();
    await setSyncMeta('last_pull_timestamp', now);

    updateState({
      status: 'online',
      syncProgress: 100,
      lastPullDate: now,
    });

    console.log('[SyncEngine] Pull completed successfully.');
    return true;
  } catch (error) {
    console.error('[SyncEngine] Pull failed:', error);
    updateState({
      status: 'error',
      errorMessage: 'Error al descargar datos. Se usarán datos locales.',
    });
    return false;
  }
}

// ─── PUSH: Upload pending mutations from IndexedDB → Supabase ──

/**
 * Process and push all pending mutations to Supabase.
 * Mutations are processed in chronological order.
 */
export async function pushPendingMutations(): Promise<boolean> {
  if (!currentState.isOnline) {
    console.warn('[SyncEngine] Offline, skipping push.');
    return false;
  }

  const pending = await getPendingMutations();
  if (pending.length === 0) {
    updateState({ pendingCount: 0 });
    return true;
  }

  updateState({ status: 'syncing', pendingCount: pending.length, syncProgress: 0 });

  let processed = 0;
  let hasErrors = false;

  for (const mutation of pending) {
    try {
      await updateMutationStatus(mutation.id, 'SYNCING');
      await executeMutation(mutation);
      await removeMutation(mutation.id);
      processed++;
    } catch (error) {
      console.error(`[SyncEngine] Failed to push mutation ${mutation.id}:`, error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      await updateMutationStatus(mutation.id, 'FAILED', errMsg);
      hasErrors = true;
      // Don't block other mutations — continue processing
    }

    const remaining = pending.length - processed;
    updateState({
      syncProgress: Math.round((processed / pending.length) * 100),
      pendingCount: remaining,
    });
  }

  const now = new Date().toISOString();
  await setSyncMeta('last_push_timestamp', now);

  const finalCount = await getPendingCount();
  updateState({
    status: hasErrors ? 'error' : 'online',
    pendingCount: finalCount,
    lastPushDate: now,
    syncProgress: 100,
    errorMessage: hasErrors ? 'Algunos cambios no pudieron sincronizarse.' : undefined,
  });

  // If we pushed mutations, do a fresh pull to get server-generated IDs, sequences, etc.
  if (processed > 0 && !hasErrors) {
    await pullAllData();
  }

  return !hasErrors;
}

/**
 * Execute a single mutation against Supabase.
 * Maps entity + action to the appropriate Supabase call.
 */
async function executeMutation(mutation: OutboxMutation): Promise<void> {
  const { entity, action, payload } = mutation;

  switch (action) {
    case 'CREATE': {
      const { _localId, ...insertData } = payload as Record<string, unknown> & { _localId?: string };
      const { error } = await supabase.from(entity).insert(insertData);
      if (error) throw new Error(`INSERT ${entity}: ${error.message}`);
      break;
    }
    case 'UPDATE': {
      const { _id, ...updateData } = payload as Record<string, unknown> & { _id: string };
      if (!_id) throw new Error(`UPDATE ${entity}: missing _id`);
      const { error } = await supabase.from(entity).update(updateData).eq('id', _id);
      if (error) throw new Error(`UPDATE ${entity}: ${error.message}`);
      break;
    }
    case 'DELETE': {
      const id = payload._id as string;
      if (!id) throw new Error(`DELETE ${entity}: missing _id`);
      const { error } = await supabase.from(entity).delete().eq('id', id);
      if (error) throw new Error(`DELETE ${entity}: ${error.message}`);
      break;
    }
  }
}

// ─── Manual Sync Trigger ────────────────────────────────────────

/** Full bidirectional sync: push first, then pull */
export async function triggerFullSync(): Promise<boolean> {
  const pushOk = await pushPendingMutations();
  const pullOk = await pullAllData();
  return pushOk && pullOk;
}

// ─── Refresh pending count ─────────────────────────────────────

export async function refreshPendingCount(): Promise<void> {
  const count = await getPendingCount();
  updateState({ pendingCount: count });
}

// ─── Initialize on App Start ───────────────────────────────────

/** 
 * Initialize the sync engine.
 * Should be called once at app startup inside SyncProvider.
 */
export async function initSyncEngine(): Promise<void> {
  // Start network listeners
  initNetworkListeners();

  // Load cached sync metadata
  const lastPull = await getSyncMeta('last_pull_timestamp');
  const lastPush = await getSyncMeta('last_push_timestamp');
  const pending = await getPendingCount();

  updateState({
    lastPullDate: lastPull ? String(lastPull) : null,
    lastPushDate: lastPush ? String(lastPush) : null,
    pendingCount: pending,
  });

  // If online, do initial pull
  if (currentState.isOnline) {
    await pullAllData();
    // Also push any pending mutations from previous offline sessions
    if (pending > 0) {
      await pushPendingMutations();
    }
  }
}
