import { getDb, QStackDatabase } from '../database/db';
import { apiService } from './apiService';
import { v4 as uuidv4 } from 'uuid';
import { DISABLE_OFFLINE } from '../config/offline';

export function getActiveTenantId(): string {
  if (typeof window === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("active_tenant_id="));
  if (!match) return "";
  try {
    return decodeURIComponent(match.split("=")[1]);
  } catch {
    return match.split("=")[1] || "";
  }
}

class SyncService {
  private isSyncing = false;
  private consecutiveFailures = 0;

  private handleSyncFailure(error: any) {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 3) {
      console.warn("Consecutive sync failures exceeded threshold. Switching to offline mode.");
      try {
        const { setGlobalOffline } = require('../hooks/useIsOffline');
        setGlobalOffline(true);
      } catch (err) {
        console.error("Failed to set global offline", err);
      }
    }
  }

  get db(): QStackDatabase {
    const tenantId = getActiveTenantId();
    if (!tenantId) {
      throw new Error("No active tenant context found.");
    }
    return getDb(tenantId);
  }

  isOnline(): boolean {
    if (DISABLE_OFFLINE) return true;
    if (typeof window === "undefined") return true;
    try {
      const { getIsOfflineStatus } = require('../hooks/useIsOffline');
      return navigator.onLine && !getIsOfflineStatus();
    } catch {
      return navigator.onLine;
    }
  }

  /**
   * Pull delta changes from the server and update Dexie local tables.
   */
  async pull(): Promise<void> {
    const tenantId = getActiveTenantId();
    if (!tenantId) return;

    const storageKey = `qstack_last_pulled_${tenantId}`;
    const lastPulledAt = localStorage.getItem(storageKey);

    try {
      const response = await apiService.post('/sync/pull/', {
        last_pulled_at: lastPulledAt || null
      });

      const { changes, server_timestamp } = response;
      const db = this.db;

      // Wrap in a write transaction for performance and consistency
      await db.transaction('rw', [
        db.categories,
        db.products,
        db.stockBatches,
        db.productInventories,
        db.customers,
        db.sales,
        db.saleItems,
        db.debts,
        db.expenses
      ], async () => {
        // 1. Categories
        if (changes.categories) {
          for (const item of changes.categories) {
            if (item.deleted) {
              await db.categories.delete(item.id);
            } else {
              await db.categories.put(item);
            }
          }
        }

        // 2. Products
        if (changes.products) {
          for (const item of changes.products) {
            if (item.deleted) {
              await db.products.delete(item.id);
            } else {
              await db.products.put(item);
            }
          }
        }

        // 3. Stock Batches
        if (changes.stock_batches) {
          for (const item of changes.stock_batches) {
            if (item.deleted) {
              await db.stockBatches.delete(item.id);
            } else {
              await db.stockBatches.put(item);
            }
          }
        }

        // 4. Product Inventories
        if (changes.product_inventories) {
          for (const item of changes.product_inventories) {
            if (item.deleted) {
              await db.productInventories.delete(item.id);
            } else {
              await db.productInventories.put(item);
            }
          }
        }

        // 5. Customers
        if (changes.customers) {
          for (const item of changes.customers) {
            if (item.deleted) {
              await db.customers.delete(item.id);
            } else {
              await db.customers.put(item);
            }
          }
        }

        // 6. Sales & SaleItems
        if (changes.sales) {
          for (const item of changes.sales) {
            if (item.deleted) {
              await db.sales.delete(item.id);
            } else {
              // Extract items to keep DB relational structure clean
              const { items, ...saleDetails } = item;
              await db.sales.put(saleDetails);
            }
          }
        }

        if (changes.sale_items) {
          for (const item of changes.sale_items) {
            if (item.deleted) {
              await db.saleItems.delete(item.id);
            } else {
              await db.saleItems.put(item);
            }
          }
        }

        // 7. Debts
        if (changes.debts) {
          for (const item of changes.debts) {
            if (item.deleted) {
              await db.debts.delete(item.id);
            } else {
              await db.debts.put(item);
            }
          }
        }

        // 8. Expenses
        if (changes.expenses) {
          for (const item of changes.expenses) {
            if (item.deleted) {
              await db.expenses.delete(item.id);
            } else {
              await db.expenses.put(item);
            }
          }
        }
      });

      localStorage.setItem(storageKey, server_timestamp);
      this.consecutiveFailures = 0;

      // Invalidate React Query cache to trigger UI refresh with newly synced data
      try {
        const { getGlobalQueryClient } = require("@/providers/QueryProviders");
        const queryClient = getGlobalQueryClient();
        if (queryClient) {
          queryClient.invalidateQueries();
        }
      } catch (err) {
        console.error("Failed to invalidate queries after sync pull", err);
      }
    } catch (error) {
      console.error("Sync pull failed:", error);
      this.handleSyncFailure(error);
      throw error;
    }
  }

  /**
   * Push pending outbox mutations to the backend.
   */
  async push(): Promise<void> {
    if (!this.isOnline()) return;
    if (this.isSyncing) return;

    const tenantId = getActiveTenantId();
    if (!tenantId) return;

    this.isSyncing = true;
    const db = this.db;

    try {
      const outboxItems = await db.outbox.orderBy('timestamp').toArray();
      if (outboxItems.length === 0) {
        this.isSyncing = false;
        return;
      }

      // Group mutations to push in a single batch
      const response = await apiService.post('/sync/push/', {
        mutations: outboxItems.map(item => ({
          action: item.action,
          table: item.table,
          record_id: item.record_id,
          payload: item.payload
        }))
      });

      const { results, errors } = response;

      // Remove successfully synced items from outbox
      const successfulIds = outboxItems
        .filter((item, index) => {
          const res = results?.find((r: any) => r.record_id === item.record_id);
          return res && (
            res.status === 'success' || 
            res.status === 'already_exists' || 
            res.status === 'deleted' || 
            res.status === 'already_deleted' ||
            res.status === 'conflict_resolved_server_won'
          );
        })
        .map(item => item.id)
        .filter((id): id is number => id !== undefined);

      if (successfulIds.length > 0) {
        await db.outbox.bulkDelete(successfulIds);
        this.consecutiveFailures = 0;
      }

      if (errors && errors.length > 0) {
        console.warn("Some sync mutations had errors:", errors);
      }
    } catch (error) {
      console.error("Sync push failed:", error);
      this.handleSyncFailure(error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Run full bi-directional sync.
   */
  async syncAll(): Promise<void> {
    if (!this.isOnline()) return;
    await this.push();
    await this.pull();
  }

  /**
   * Optimistically record a mutation locally and queue it in the outbox.
   */
  async registerMutation(
    table: 'categories' | 'products' | 'stockBatches' | 'productInventories' | 'customers' | 'sales' | 'saleItems' | 'debts' | 'expenses',
    action: 'create' | 'update' | 'delete',
    recordId: string,
    payload: any
  ): Promise<any> {
    const db = this.db;
    const tenantId = getActiveTenantId();

    // Map table property to sync table name
    const syncTableMap: Record<string, string> = {
      categories: 'categories',
      products: 'products',
      stockBatches: 'stock_batches',
      productInventories: 'product_inventories',
      customers: 'customers',
      sales: 'sales',
      saleItems: 'sale_items',
      debts: 'debts',
      expenses: 'expenses'
    };

    // Update Dexie database instance
    await db.transaction('rw', [db[table], db.outbox], async () => {
      if (action === 'delete') {
        await db[table].delete(recordId);
      } else {
        // Standard put (upsert)
        await db[table].put({
          id: recordId,
          ...payload,
          tenant_id: tenantId,
          updated_at: new Date().toISOString(),
          deleted: 0
        });
      }

      // Add to outbox queue
      await db.outbox.add({
        action,
        table: syncTableMap[table],
        record_id: recordId,
        payload,
        timestamp: Date.now(),
        tenant_id: tenantId
      });
    });

    // Trigger background push if online
    if (this.isOnline()) {
      this.push().catch(err => console.error("Async background sync push failed", err));
    }

    return { id: recordId, ...payload };
  }
}

export const syncService = new SyncService();
