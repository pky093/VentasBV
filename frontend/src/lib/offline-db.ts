/**
 * Offline Database (IndexedDB) for VentasBV
 * Provides local storage for all critical business entities
 * enabling full offline operation with automatic sync.
 */

const DB_NAME = 'VentasBV_OfflineDB';
const DB_VERSION = 2;

// Store names
export const STORES = {
  PRODUCTS: 'products',
  BRANCH_INVENTORY: 'branch_inventory',
  CATEGORIES: 'categories',
  BRANDS: 'brands',
  MODELS: 'models',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  CREDITS: 'credits',
  CREDIT_INSTALLMENTS: 'credit_installments',
  EXPENSES: 'expenses',
  BRANCHES: 'branches',
  INVENTORY_MOVEMENTS: 'inventory_movements',
  CONTRACTS: 'contracts',
  NOTIFICATIONS: 'notifications',
  ROLES: 'roles',
  USERS: 'users',
  SETTINGS: 'settings',
  OUTBOX: 'outbox_mutations',
  SYNC_META: 'sync_meta',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

/** Represents a queued mutation for later sync */
export interface OutboxMutation {
  id: string;
  entity: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  timestamp: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;
  errorMessage?: string;
}

export interface SyncMeta {
  key: string;
  value: string | number;
  updatedAt: number;
}

// ─── IndexedDB Helper ──────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbOpenPromise) return dbOpenPromise;

  dbOpenPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create all object stores
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.BRANCH_INVENTORY)) {
        const biStore = db.createObjectStore(STORES.BRANCH_INVENTORY, { keyPath: 'id' });
        biStore.createIndex('by_product', 'product_id', { unique: false });
        biStore.createIndex('by_branch', 'branch_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.BRANDS)) {
        db.createObjectStore(STORES.BRANDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.MODELS)) {
        db.createObjectStore(STORES.MODELS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
        db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SUPPLIERS)) {
        db.createObjectStore(STORES.SUPPLIERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SALES)) {
        const salesStore = db.createObjectStore(STORES.SALES, { keyPath: 'id' });
        salesStore.createIndex('by_branch', 'branch_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.SALE_ITEMS)) {
        const siStore = db.createObjectStore(STORES.SALE_ITEMS, { keyPath: 'id' });
        siStore.createIndex('by_sale', 'sale_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.CREDITS)) {
        const creditsStore = db.createObjectStore(STORES.CREDITS, { keyPath: 'id' });
        creditsStore.createIndex('by_sale', 'sale_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.CREDIT_INSTALLMENTS)) {
        const ciStore = db.createObjectStore(STORES.CREDIT_INSTALLMENTS, { keyPath: 'id' });
        ciStore.createIndex('by_credit', 'credit_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        db.createObjectStore(STORES.EXPENSES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.BRANCHES)) {
        db.createObjectStore(STORES.BRANCHES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.INVENTORY_MOVEMENTS)) {
        const imStore = db.createObjectStore(STORES.INVENTORY_MOVEMENTS, { keyPath: 'id' });
        imStore.createIndex('by_product', 'product_id', { unique: false });
        imStore.createIndex('by_branch', 'branch_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.CONTRACTS)) {
        db.createObjectStore(STORES.CONTRACTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.ROLES)) {
        db.createObjectStore(STORES.ROLES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        db.createObjectStore(STORES.USERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
        const outboxStore = db.createObjectStore(STORES.OUTBOX, { keyPath: 'id' });
        outboxStore.createIndex('by_status', 'status', { unique: false });
        outboxStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
        db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onclose = () => {
        dbInstance = null;
        dbOpenPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      dbOpenPromise = null;
      reject(request.error);
    };
  });

  return dbOpenPromise;
}

// ─── Generic CRUD Operations ──────────────────────────────────────

/** Get a single record by key */
export async function getRecord<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

/** Get all records from a store */
export async function getAllRecords<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/** Get records by index */
export async function getByIndex<T>(storeName: StoreName, indexName: string, key: IDBValidKey): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(key);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

/** Put (upsert) a single record */
export async function putRecord<T>(storeName: StoreName, record: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Put many records in a single transaction (bulk upsert) */
export async function putManyRecords<T>(storeName: StoreName, records: T[]): Promise<void> {
  if (records.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const record of records) {
      store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Delete a single record by key */
export async function deleteRecord(storeName: StoreName, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Clear all records from a store */
export async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Clear all business entity stores (useful when switching tenant or fresh re-sync) */
export async function clearAllTenantStores(): Promise<void> {
  const tenantStores: StoreName[] = [
    STORES.PRODUCTS,
    STORES.BRANCH_INVENTORY,
    STORES.CATEGORIES,
    STORES.BRANDS,
    STORES.MODELS,
    STORES.CUSTOMERS,
    STORES.SUPPLIERS,
    STORES.SALES,
    STORES.SALE_ITEMS,
    STORES.CREDITS,
    STORES.CREDIT_INSTALLMENTS,
    STORES.EXPENSES,
    STORES.BRANCHES,
    STORES.INVENTORY_MOVEMENTS,
    STORES.CONTRACTS,
    STORES.NOTIFICATIONS,
    STORES.ROLES,
    STORES.USERS,
    STORES.SETTINGS,
  ];

  for (const s of tenantStores) {
    try {
      await clearStore(s);
    } catch (_) {
      /* ignore */
    }
  }
}

/** Count records in a store */
export async function countRecords(storeName: StoreName): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Outbox Mutations Queue ──────────────────────────────────────

/** Generate a UUID for local records */
function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Queue a mutation for later sync to Supabase */
export async function queueMutation(
  entity: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: Record<string, unknown>
): Promise<string> {
  const mutation: OutboxMutation = {
    id: generateLocalId(),
    entity,
    action,
    payload,
    timestamp: Date.now(),
    status: 'PENDING',
    retryCount: 0,
  };
  await putRecord(STORES.OUTBOX, mutation);
  return mutation.id;
}

/** Get all pending mutations ordered by timestamp */
export async function getPendingMutations(): Promise<OutboxMutation[]> {
  const all = await getAllRecords<OutboxMutation>(STORES.OUTBOX);
  return all
    .filter((m) => m.status === 'PENDING' || m.status === 'FAILED')
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** Remove a successfully synced mutation */
export async function removeMutation(id: string): Promise<void> {
  await deleteRecord(STORES.OUTBOX, id);
}

/** Update a mutation status */
export async function updateMutationStatus(
  id: string,
  status: OutboxMutation['status'],
  errorMessage?: string
): Promise<void> {
  const mutation = await getRecord<OutboxMutation>(STORES.OUTBOX, id);
  if (mutation) {
    mutation.status = status;
    mutation.retryCount = (mutation.retryCount || 0) + (status === 'FAILED' ? 1 : 0);
    if (errorMessage) mutation.errorMessage = errorMessage;
    await putRecord(STORES.OUTBOX, mutation);
  }
}

/** Get count of pending mutations */
export async function getPendingCount(): Promise<number> {
  const all = await getAllRecords<OutboxMutation>(STORES.OUTBOX);
  return all.filter((m) => m.status === 'PENDING' || m.status === 'FAILED').length;
}

// ─── Sync Metadata ──────────────────────────────────────────────

/** Get a sync metadata value */
export async function getSyncMeta(key: string): Promise<string | number | undefined> {
  const record = await getRecord<SyncMeta>(STORES.SYNC_META, key);
  return record?.value;
}

/** Set a sync metadata value */
export async function setSyncMeta(key: string, value: string | number): Promise<void> {
  await putRecord(STORES.SYNC_META, { key, value, updatedAt: Date.now() });
}

// ─── Bulk Replace (for pull sync) ─────────────────────────────────

/** Replace all records in a store (clear + bulk insert) */
export async function replaceAllRecords<T>(storeName: StoreName, records: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const record of records) {
      store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Export the generateLocalId for use in offline sale creation */
export { generateLocalId };
