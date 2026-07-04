import Dexie, { type Table } from 'dexie';

// Define structures for our models
export interface Category {
  id: string;
  name: string;
  business_type: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted: number; // 0 or 1 for boolean representation in index
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  unit_price: number;
  barcode?: string;
  description?: string;
  category_id?: string;
  tenant_id: string;
  base_unit: string;
  pack_unit?: string;
  pack_size?: number;
  pack_price?: string;
  image?: string;
  is_active: boolean;
  variants?: any[];
  capacities?: any[];
  production_date?: string | null;
  expiry_date?: string | null;
  best_before_days?: number | null;
  created_at: string;
  updated_at: string;
  deleted: number;
}

export interface StockBatch {
  id: string;
  product_id: string;
  batch_number: string;
  quantity: number;
  purchase_price?: string;
  sell_price?: string;
  expiry_date?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted: number;
}

export interface ProductInventory {
  id: string;
  product_id: string;
  quantity: number;
  low_stock_threshold: number;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted: number;
}

export interface Sale {
  id: string;
  customer_id?: string;
  total_amount: string;
  payment_method: string;
  status: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  sell_unit: string;
  variant?: string;
  capacity?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  deleted: number;
}

export interface OutboxItem {
  id?: number; // auto-incremented primary key for outbox queue
  action: 'create' | 'update' | 'delete';
  table: string;
  record_id: string;
  payload: any;
  timestamp: number;
  tenant_id: string;
}

export class QStackDatabase extends Dexie {
  categories!: Table<Category, string>;
  products!: Table<Product, string>;
  stockBatches!: Table<StockBatch, string>;
  productInventories!: Table<ProductInventory, string>;
  customers!: Table<Customer, string>;
  sales!: Table<Sale, string>;
  saleItems!: Table<SaleItem, string>;
  outbox!: Table<OutboxItem, number>;

  constructor(tenantId: string) {
    // Dynamic database per tenant to ensure strict multi-tenant isolation on client devices
    super(`qstack_db_${tenantId}`);
    
    this.version(1).stores({
      categories: 'id, business_type, name, tenant_id, deleted',
      products: 'id, sku, barcode, category_id, tenant_id, deleted',
      stockBatches: 'id, product_id, expiry_date, tenant_id, deleted',
      productInventories: 'id, product_id, tenant_id, deleted',
      customers: 'id, name, phone, email, tenant_id, deleted',
      sales: 'id, customer_id, status, tenant_id, deleted',
      saleItems: 'id, sale_id, product_id, tenant_id, deleted',
      outbox: '++id, table, record_id, action, tenant_id, timestamp'
    });
  }
}

// Helper function to get database instance for active tenant dynamically
let activeDbInstance: QStackDatabase | null = null;
let activeDbTenantId: string | null = null;

export function getDb(tenantId: string): QStackDatabase {
  if (!tenantId) {
    throw new Error("Tenant ID is required to instantiate client-side database.");
  }
  
  if (activeDbInstance && activeDbTenantId === tenantId) {
    return activeDbInstance;
  }
  
  // Close previous instance if tenant changed
  if (activeDbInstance) {
    activeDbInstance.close();
  }
  
  activeDbInstance = new QStackDatabase(tenantId);
  activeDbTenantId = tenantId;
  return activeDbInstance;
}
