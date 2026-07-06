import { toast } from "sonner";
import { getDb, QStackDatabase } from "../database/db";
import { getActiveTenantId, syncService } from "./syncService";
import { v4 as uuidv4 } from "uuid";

function getOfflineUser(): any {
  if (typeof window === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("session_user="));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split("=")[1]));
  } catch {
    return null;
  }
}

function parseExpiryDate(expiryDate: unknown): Date | null {
  if (!expiryDate) return null;
  if (expiryDate instanceof Date) return expiryDate;
  if (typeof expiryDate === "string") {
    const dateString = expiryDate.split("T")[0];
    const parsed = new Date(dateString);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function getDaysUntilExpiry(expiryDate: unknown): number | null {
  const parsed = parseExpiryDate(expiryDate);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(parsed);
  expiry.setHours(0, 0, 0, 0);
  const diff = expiry.getTime() - today.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getBatchStatus(
  expiryDate: unknown,
): "fresh" | "near_expiry" | "critical" | "expired" | "no_expiry" {
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null) return "no_expiry";
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "near_expiry";
  return "fresh";
}

function normalizeBatch(batch: any) {
  const quantity = Number(batch.quantity || 0);
  const initial_quantity =
    batch.initial_quantity !== undefined
      ? Number(batch.initial_quantity)
      : quantity;
  return {
    ...batch,
    quantity,
    initial_quantity,
    status: batch.status || getBatchStatus(batch.expiry_date),
    days_until_expiry:
      batch.days_until_expiry !== undefined && batch.days_until_expiry !== null
        ? Number(batch.days_until_expiry)
        : getDaysUntilExpiry(batch.expiry_date),
  };
}

class OfflineInterceptor {
  get db(): QStackDatabase {
    const tenantId = getActiveTenantId();
    if (!tenantId) throw new Error("No active tenant context found.");
    return getDb(tenantId);
  }

  async handleGet(url: string, params?: Record<string, any>): Promise<any> {
    const normalizedUrl = url.replace(/^\/api/, "");

    // Auth & Business Profile fallbacks (do not require active tenant db context)
    if (normalizedUrl === "/auth/user/") {
      const user = getOfflineUser();
      if (!user) throw new Error("No user profile cached locally.");
      return user;
    }

    if (normalizedUrl === "/business/profile/") {
      const tenantId = getActiveTenantId();
      if (tenantId) {
        const cached = localStorage.getItem(
          `qstack_business_profile_${tenantId}`,
        );
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            // fallback
          }
        }
      }
      throw new Error("No business profile cached locally.");
    }

    const db = this.db;

    // 1. GET Products
    if (normalizedUrl.startsWith("/inventory/products/")) {
      // Check if it's Categories or Stats or a single product
      if (normalizedUrl.includes("/categories/")) {
        const categories = await db.categories.toArray();
        return categories;
      }
      if (normalizedUrl.includes("/stats/")) {
        const products = await db.products.toArray();
        const sales = await db.sales.toArray();

        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        const thirtyDaysFromNow = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000,
        );
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

        let totalValue = 0;
        let totalItems = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let expiredCount = 0;
        let nearExpiryCount = 0;

        products.forEach((p) => {
          const stock = p.stock || 0;
          const unitPrice = Number(p.unit_price || 0);
          totalValue += stock * unitPrice;
          totalItems += stock;

          if (stock === 0) {
            outOfStockCount++;
          } else if (stock <= 5) {
            lowStockCount++;
          }

          if (p.expiry_date) {
            if (p.expiry_date < todayStr) {
              expiredCount++;
            } else if (
              p.expiry_date >= todayStr &&
              p.expiry_date <= thirtyDaysStr
            ) {
              nearExpiryCount++;
            }
          }
        });

        return {
          total_value: totalValue,
          total_items: totalItems,
          product_count: products.length,
          low_stock: lowStockCount,
          out_of_stock: outOfStockCount,
          expired: expiredCount,
          near_expiry: nearExpiryCount,
          // keep legacy fields just in case
          total_products: products.length,
          low_stock_products: lowStockCount,
          total_sales_today: sales.length,
        };
      }

      // Check for single product detail: /inventory/products/{uuid}/
      const match = normalizedUrl.match(
        /\/inventory\/products\/([a-fA-F0-9-]{36})\//,
      );
      if (match) {
        const productId = match[1];
        const product = await db.products.get(productId);
        if (!product) throw new Error("Product not found locally");

        const category = product.category_id
          ? await db.categories.get(product.category_id)
          : null;
        const rawBatches = await db.stockBatches
          .where("product_id")
          .equals(productId)
          .toArray();
        const batches = rawBatches.map(normalizeBatch);
        const inventory = await db.productInventories
          .where("product_id")
          .equals(productId)
          .first();
        const computedStock = batches.reduce(
          (sum, batch) => sum + Number(batch.quantity || 0),
          0,
        );

        return {
          ...product,
          category: category || null,
          images: product.image
            ? [{ id: "primary", image: product.image, is_primary: true }]
            : [],
          batches: batches,
          inventory: inventory || null,
          stock: Number(product.stock || 0) || computedStock,
        };
      }

      // Default to product list querying
      let products = await db.products.toArray();
      const categories = await db.categories.toArray();
      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      const rawBatches = await db.stockBatches.toArray();
      const inventories = await db.productInventories.toArray();

      let enrichedProducts = products.map((p) => {
        const prodBatches = rawBatches
          .filter((b) => b.product_id === p.id)
          .map(normalizeBatch);
        const batchStock = prodBatches.reduce(
          (sum, batch) => sum + Number(batch.quantity || 0),
          0,
        );
        const prodInventory = inventories.find((i) => i.product_id === p.id);
        return {
          ...p,
          category: p.category_id ? categoryMap.get(p.category_id) : null,
          images: p.image
            ? [{ id: "primary", image: p.image, is_primary: true }]
            : [],
          batches: prodBatches,
          inventory: prodInventory || null,
          stock: Number(p.stock || 0) || batchStock,
        };
      });

      // Apply Search filter
      const search = params?.search;
      if (search) {
        const term = String(search).toLowerCase();
        enrichedProducts = enrichedProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.sku.toLowerCase().includes(term),
        );
      }

      // Apply Category filter
      const category = params?.category;
      if (category) {
        enrichedProducts = enrichedProducts.filter(
          (p) => p.category_id === category || p.category?.name === category,
        );
      }

      // Apply active status
      if (params?.active_status === "active") {
        enrichedProducts = enrichedProducts.filter((p) => p.is_active);
      }

      // Mock Pagination
      if (params?.no_pagination === "true" || params?.no_pagination === true) {
        return enrichedProducts;
      }

      const page = Number(params?.page) || 1;
      const pageSize = Number(params?.page_size) || 9;
      const start = (page - 1) * pageSize;
      const paginatedResults = enrichedProducts.slice(start, start + pageSize);

      return {
        count: enrichedProducts.length,
        next:
          start + pageSize < enrichedProducts.length
            ? `?page=${page + 1}`
            : null,
        previous: page > 1 ? `?page=${page - 1}` : null,
        results: paginatedResults,
      };
    }

    // 2. GET Customers
    if (normalizedUrl.startsWith("/sales/customers/")) {
      let customers = await db.customers.toArray();
      const search = params?.search;
      if (search) {
        const term = String(search).toLowerCase();
        customers = customers.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            (c.phone ? c.phone.includes(term) : false),
        );
      }
      return customers;
    }

    // 3. GET Sales
    if (normalizedUrl.startsWith("/sales/")) {
      const match = normalizedUrl.match(/\/sales\/([a-fA-F0-9-]{36})\//);
      if (match) {
        const saleId = match[1];
        const sale = await db.sales.get(saleId);
        if (!sale) throw new Error("Sale not found locally");
        const items = await db.saleItems
          .where("sale_id")
          .equals(saleId)
          .toArray();
        return { ...sale, items };
      }

      const sales = await db.sales.toArray();
      return sales;
    }

    // 4. GET Debts
    if (normalizedUrl.startsWith("/finance/debts/")) {
      const match = normalizedUrl.match(/\/finance\/debts\/([a-fA-F0-9-]{36})\//);
      if (match) {
        const debtId = match[1];
        const debt = await db.debts.get(debtId);
        if (!debt) throw new Error("Debt not found locally");
        const customer = debt.customer_id ? await db.customers.get(debt.customer_id) : null;
        return {
          ...debt,
          customer: customer || null,
        };
      }

      const debts = await db.debts.toArray();
      const customers = await db.customers.toArray();
      const customerMap = new Map(customers.map((c) => [c.id, c]));
      return debts.map((d) => ({
        ...d,
        customer: d.customer_id ? customerMap.get(d.customer_id) || null : null,
      }));
    }

    // 5. GET Expenses
    if (normalizedUrl.startsWith("/finance/expenses/")) {
      const match = normalizedUrl.match(/\/finance\/expenses\/([a-fA-F0-9-]{36})\//);
      if (match) {
        const expenseId = match[1];
        const expense = await db.expenses.get(expenseId);
        if (!expense) throw new Error("Expense not found locally");
        return expense;
      }

      const expenses = await db.expenses.toArray();
      return expenses;
    }

    throw new Error(`Offline query handler not implemented for URL: ${url}`);
  }

  async handleWrite(method: string, url: string, data?: any): Promise<any> {
    const db = this.db;
    const tenantId = getActiveTenantId();
    const recordId = uuidv4();
    const timestamp = new Date().toISOString();
    const normalizedUrl = url.replace(/^\/api/, "");

    if (
      normalizedUrl === "/inventory/products/categories/" ||
      normalizedUrl.startsWith("/inventory/products/categories/")
    ) {
      toast.error("Category changes are read-only in offline mode.");
      return;
    }

    // 1. Create Sale (POS Checkout)
    if (normalizedUrl === "/sales/" && method === "POST") {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomStr = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      const saleNumber = `REC-${dateStr}-${randomStr}`;

      let calculatedSubtotal = 0;
      const saleItemsPayload: any[] = [];

      // Register the child sale items and deduct stock
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const product = await db.products.get(item.product_id);
          if (product) {
            let unitPrice = Number(product.unit_price || 0);

            // multiplier for packs
            const multiplier =
              item.sell_unit === "pack" && (product as any).units_per_pack
                ? (product as any).units_per_pack
                : 1;

            // Resolve capacity-based price
            if (item.capacity && product.capacities) {
              for (const cap of product.capacities) {
                if (
                  typeof cap === "object" &&
                  cap &&
                  cap.name === item.capacity &&
                  cap.price
                ) {
                  unitPrice = Number(cap.price);
                  break;
                }
              }
            }

            if (item.sell_unit === "pack" && product.pack_price) {
              unitPrice = Number(product.pack_price);
            } else if (multiplier > 1) {
              unitPrice = unitPrice * multiplier;
            }

            const totalPrice = unitPrice * item.quantity;
            calculatedSubtotal += totalPrice;

            const itemId = uuidv4();
            const itemPayload = {
              id: itemId,
              sale_id: recordId,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: String(unitPrice),
              total_price: String(totalPrice),
              sell_unit: item.sell_unit || "loose",
              variant: item.variant || null,
              capacity: item.capacity || null,
              deleted: 0,
            };
            await syncService.registerMutation(
              "saleItems",
              "create",
              itemId,
              itemPayload,
            );

            saleItemsPayload.push({
              ...itemPayload,
              product_name: product.name,
            });

            // Deduct product stock in IndexedDB
            const newStock = Math.max(0, (product.stock || 0) - item.quantity);

            // Also deduct from batches (FEFO order)
            const prodBatches = await db.stockBatches
              .where("product_id")
              .equals(item.product_id)
              .toArray();
            // Sort FEFO: non-null expiry dates first (ascending), null expiry dates last
            prodBatches.sort((a, b) => {
              if (!a.expiry_date) return 1;
              if (!b.expiry_date) return -1;
              return a.expiry_date.localeCompare(b.expiry_date);
            });

            let remainingToDeduct = item.quantity;
            for (const batch of prodBatches) {
              if (remainingToDeduct <= 0) break;
              const batchQty = batch.quantity || 0;
              if (batchQty > 0) {
                const deducted = Math.min(batchQty, remainingToDeduct);
                const newBatchQty = batchQty - deducted;
                remainingToDeduct -= deducted;

                await db.stockBatches.put({
                  ...batch,
                  quantity: newBatchQty,
                  updated_at: new Date().toISOString(),
                });

                // Register mutation for batch update
                await db.outbox.add({
                  action: "update",
                  table: "stock_batches",
                  record_id: batch.id,
                  payload: { quantity: newBatchQty },
                  timestamp: Date.now(),
                  tenant_id: tenantId,
                });
              }
            }

            await db.products.put({
              ...product,
              stock: newStock,
              updated_at: new Date().toISOString(),
            });

            // Register mutation for product update
            await db.outbox.add({
              action: "update",
              table: "products",
              record_id: product.id,
              payload: { stock: newStock },
              timestamp: Date.now(),
              tenant_id: tenantId,
            });
          }
        }
      }

      const tax = Number(data.tax || 0);
      const discount = Number(data.discount || 0);
      const totalAmount = Math.max(0, calculatedSubtotal + tax - discount);

      // Get Cashier Details
      const user = getOfflineUser();
      const cashierName = user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.email
        : "System";
      const cashierEmail = user ? user.email : "system@qstack.com";

      // Get Customer Details
      let customerPayload = null;
      if (data.customer_id) {
        const customer = await db.customers.get(data.customer_id);
        if (customer) {
          customerPayload = {
            id: customer.id,
            name: customer.name,
            phone: customer.phone || "",
            email: customer.email || "",
          };
        }
      } else if (data.customer_name && data.customer_phone) {
        customerPayload = {
          id: uuidv4(),
          name: data.customer_name,
          phone: data.customer_phone,
          email: "",
        };
      }

      const dbPayload = {
        sale_number: saleNumber,
        subtotal: String(calculatedSubtotal),
        tax: String(tax),
        discount: String(discount),
        total_amount: String(totalAmount),
        payment_method: data.payment_method || "cash",
        payment_status: "paid",
        customer_id: customerPayload?.id || null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted: 0,
      };

      // Register the main sale creation mutation
      await syncService.registerMutation(
        "sales",
        "create",
        recordId,
        dbPayload,
      );

      return {
        ...dbPayload,
        id: recordId,
        customer: customerPayload,
        cashier_name: cashierName,
        cashier_email: cashierEmail,
        items: saleItemsPayload,
      };
    }

    // 2. Add Category
    if (
      normalizedUrl === "/inventory/products/categories/" &&
      method === "POST"
    ) {
      const categoryPayload = {
        id: recordId,
        name: data.name,
        description: data.description || "",
        business_type: data.business_type || "general",
        default_best_before_days: Number(data.default_best_before_days || 0),
        expiry_strategy: data.expiry_strategy || "GENERAL",
        created_at: timestamp,
        updated_at: timestamp,
        deleted: 0,
      };
      await syncService.registerMutation(
        "categories",
        "create",
        recordId,
        categoryPayload,
      );
      return categoryPayload;
    }

    // 3. Edit Category
    const categoryEditMatch = normalizedUrl.match(
      /\/inventory\/products\/categories\/([a-fA-F0-9-]{36})\//,
    );
    if (categoryEditMatch && (method === "PATCH" || method === "PUT")) {
      const categoryId = categoryEditMatch[1];
      await syncService.registerMutation(
        "categories",
        "update",
        categoryId,
        data,
      );
      return { id: categoryId, ...data };
    }

    // 4. Delete Category
    const categoryDeleteMatch = normalizedUrl.match(
      /\/inventory\/products\/categories\/([a-fA-F0-9-]{36})\//,
    );
    if (categoryDeleteMatch && method === "DELETE") {
      const categoryId = categoryDeleteMatch[1];
      await syncService.registerMutation(
        "categories",
        "delete",
        categoryId,
        null,
      );
      return { detail: "Deleted successfully" };
    }

    // 5. Add Product
    if (normalizedUrl === "/inventory/products/" && method === "POST") {
      const productPayload = {
        id: recordId,
        name: data.name,
        description: data.description || "",
        sku: data.sku || "",
        barcode: data.barcode || "",
        unit_price: String(data.unit_price || 0),
        pack_price: String(data.pack_price || 0),
        base_unit: data.base_unit || "loose",
        pack_unit: data.pack_unit || "pack",
        units_per_pack: Number(data.units_per_pack || 1),
        category_id: data.category_id || null,
        is_active: data.is_active !== false,
        created_at: timestamp,
        updated_at: timestamp,
        deleted: 0,
      };
      await syncService.registerMutation(
        "products",
        "create",
        recordId,
        productPayload,
      );
      return productPayload;
    }

    // 6. Edit Product
    const productEditMatch = normalizedUrl.match(
      /\/inventory\/products\/([a-fA-F0-9-]{36})\//,
    );
    if (productEditMatch && (method === "PATCH" || method === "PUT")) {
      const productId = productEditMatch[1];
      await syncService.registerMutation("products", "update", productId, data);
      return { id: productId, ...data };
    }

    // 7. Delete Product
    const productDeleteMatch = normalizedUrl.match(
      /\/inventory\/products\/([a-fA-F0-9-]{36})\//,
    );
    if (productDeleteMatch && method === "DELETE") {
      const productId = productDeleteMatch[1];
      await syncService.registerMutation("products", "delete", productId, null);
      return { detail: "Deleted successfully" };
    }

    // 8. Add Customer
    if (normalizedUrl === "/sales/customers/" && method === "POST") {
      const customerPayload = {
        id: recordId,
        name: data.name,
        phone: data.phone,
        email: data.email || "",
        created_at: timestamp,
        updated_at: timestamp,
        deleted: 0,
      };
      await syncService.registerMutation(
        "customers",
        "create",
        recordId,
        customerPayload,
      );
      return customerPayload;
    }

    // 9. Add Stock Batch
    const batchAddMatch = normalizedUrl.match(
      /\/inventory\/products\/([a-fA-F0-9-]{36})\/batches\//,
    );
    if (batchAddMatch && method === "POST") {
      const productId = batchAddMatch[1];
      const batchPayload = {
        id: recordId,
        product_id: productId,
        batch_number:
          data.batch_number ||
          `LOT-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        quantity: Number(data.quantity || 0),
        initial_quantity: Number(data.quantity || 0),
        production_date: data.production_date || null,
        expiry_date: data.expiry_date || null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted: 0,
      };

      await syncService.registerMutation(
        "stockBatches",
        "create",
        recordId,
        batchPayload,
      );

      // Update product stock and earliest expiry/production dates
      const product = await db.products.get(productId);
      if (product) {
        const newStock = (product.stock || 0) + batchPayload.quantity;
        const updatePayload: Record<string, any> = { stock: newStock };

        if (batchPayload.expiry_date) {
          if (
            !product.expiry_date ||
            batchPayload.expiry_date < product.expiry_date
          ) {
            updatePayload.expiry_date = batchPayload.expiry_date;
          }
        }
        if (batchPayload.production_date) {
          if (
            !product.production_date ||
            batchPayload.production_date < product.production_date
          ) {
            updatePayload.production_date = batchPayload.production_date;
          }
        }

        await db.products.put({
          ...product,
          ...updatePayload,
          updated_at: new Date().toISOString(),
        });

        // Register mutation for product update
        await db.outbox.add({
          action: "update",
          table: "products",
          record_id: productId,
          payload: updatePayload,
          timestamp: Date.now(),
          tenant_id: tenantId,
        });
      }

      return batchPayload;
    }

    // 10. Edit Stock Batch
    const batchEditMatch = normalizedUrl.match(
      /\/inventory\/products\/([a-fA-F0-9-]{36})\/batches\/([a-fA-F0-9-]{36})\//,
    );
    if (batchEditMatch && (method === "PATCH" || method === "PUT")) {
      const productId = batchEditMatch[1];
      const batchId = batchEditMatch[2];

      const oldBatch = await db.stockBatches.get(batchId);
      const oldQty = oldBatch ? oldBatch.quantity || 0 : 0;

      const updatedBatch = {
        ...oldBatch,
        ...data,
        updated_at: timestamp,
      };

      await syncService.registerMutation(
        "stockBatches",
        "update",
        batchId,
        data,
      );

      // Recalculate product stock
      const product = await db.products.get(productId);
      if (product) {
        const qtyDiff = Number(data.quantity || 0) - oldQty;
        const newStock = Math.max(0, (product.stock || 0) + qtyDiff);

        const updatePayload: Record<string, any> = { stock: newStock };
        if (data.expiry_date) updatePayload.expiry_date = data.expiry_date;
        if (data.production_date)
          updatePayload.production_date = data.production_date;

        await db.products.put({
          ...product,
          ...updatePayload,
          updated_at: new Date().toISOString(),
        });

        // Register product update mutation
        await db.outbox.add({
          action: "update",
          table: "products",
          record_id: productId,
          payload: updatePayload,
          timestamp: Date.now(),
          tenant_id: tenantId,
        });
      }

      return updatedBatch;
    }

    // 11. Delete Stock Batch
    if (batchEditMatch && method === "DELETE") {
      const productId = batchEditMatch[1];
      const batchId = batchEditMatch[2];

      const oldBatch = await db.stockBatches.get(batchId);
      const oldQty = oldBatch ? oldBatch.quantity || 0 : 0;

      await syncService.registerMutation(
        "stockBatches",
        "delete",
        batchId,
        null,
      );

      // Recalculate product stock
      const product = await db.products.get(productId);
      if (product) {
        const newStock = Math.max(0, (product.stock || 0) - oldQty);

        await db.products.put({
          ...product,
          stock: newStock,
          updated_at: new Date().toISOString(),
        });

        // Register product update mutation
        await db.outbox.add({
          action: "update",
          table: "products",
          record_id: productId,
          payload: { stock: newStock },
          timestamp: Date.now(),
          tenant_id: tenantId,
        });
      }

      return { detail: "Deleted successfully" };
    }

    // 12. Create Debt
    if (normalizedUrl === "/finance/debts/" && method === "POST") {
      const amount = Number(data.amount || 0);
      const amountPaid = Number(data.amount_paid || 0);
      
      let status: 'pending' | 'partially_paid' | 'paid' = 'pending';
      if (amountPaid >= amount) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'partially_paid';
      }

      let debtorCreditorName = data.debtor_creditor_name;
      let customerPayload = null;
      if (data.customer_id) {
        const customer = await db.customers.get(data.customer_id);
        if (customer) {
          customerPayload = {
            id: customer.id,
            name: customer.name,
            phone: customer.phone || "",
            email: customer.email || "",
          };
          if (!debtorCreditorName) {
            debtorCreditorName = customer.name;
          }
        }
      }

      const debtPayload = {
        id: recordId,
        customer_id: data.customer_id || null,
        debt_type: data.debt_type || "owed_to_us",
        debtor_creditor_name: debtorCreditorName || "",
        amount: amount,
        amount_paid: amountPaid,
        description: data.description || "",
        due_date: data.due_date || null,
        status: status,
        created_at: timestamp,
        updated_at: timestamp,
        deleted: 0,
      };

      await syncService.registerMutation(
        "debts",
        "create",
        recordId,
        debtPayload
      );

      return {
        ...debtPayload,
        customer: customerPayload,
      };
    }

    // 13. Edit/Update Debt
    const debtEditMatch = normalizedUrl.match(/\/finance\/debts\/([a-fA-F0-9-]{36})\//);
    if (debtEditMatch && (method === "PATCH" || method === "PUT")) {
      const debtId = debtEditMatch[1];
      const oldDebt = await db.debts.get(debtId);
      if (!oldDebt) throw new Error("Debt not found locally");

      const updatedData = { ...data };
      
      const amount = updatedData.amount !== undefined ? Number(updatedData.amount) : Number(oldDebt.amount);
      const amountPaid = updatedData.amount_paid !== undefined ? Number(updatedData.amount_paid) : Number(oldDebt.amount_paid);
      
      let status: 'pending' | 'partially_paid' | 'paid' = 'pending';
      if (amountPaid >= amount) {
        status = 'paid';
      } else if (amountPaid > 0) {
        status = 'partially_paid';
      }
      updatedData.status = status;

      let debtorCreditorName = updatedData.debtor_creditor_name || oldDebt.debtor_creditor_name;
      let customerPayload = null;
      const customerId = updatedData.customer_id !== undefined ? updatedData.customer_id : oldDebt.customer_id;
      if (customerId) {
        const customer = await db.customers.get(customerId);
        if (customer) {
          customerPayload = {
            id: customer.id,
            name: customer.name,
            phone: customer.phone || "",
            email: customer.email || "",
          };
          if (!updatedData.debtor_creditor_name && !oldDebt.debtor_creditor_name) {
            debtorCreditorName = customer.name;
          }
        }
      }

      const newDebt = {
        ...oldDebt,
        ...updatedData,
        debtor_creditor_name: debtorCreditorName,
        updated_at: timestamp,
      };

      await syncService.registerMutation(
        "debts",
        "update",
        debtId,
        updatedData
      );

      return {
        ...newDebt,
        customer: customerPayload,
      };
    }

    // 14. Delete Debt
    if (debtEditMatch && method === "DELETE") {
      const debtId = debtEditMatch[1];
      await syncService.registerMutation("debts", "delete", debtId, null);
      return { detail: "Deleted successfully" };
    }

    // 15. Create Expense
    if (normalizedUrl === "/finance/expenses/" && method === "POST") {
      const expensePayload = {
        id: recordId,
        category: data.category || "other",
        amount: Number(data.amount || 0),
        description: data.description || "",
        expense_date: data.expense_date || new Date().toISOString().split("T")[0],
        created_at: timestamp,
        updated_at: timestamp,
        deleted: 0,
      };

      await syncService.registerMutation(
        "expenses",
        "create",
        recordId,
        expensePayload
      );

      return expensePayload;
    }

    // 16. Edit/Update Expense
    const expenseEditMatch = normalizedUrl.match(/\/finance\/expenses\/([a-fA-F0-9-]{36})\//);
    if (expenseEditMatch && (method === "PATCH" || method === "PUT")) {
      const expenseId = expenseEditMatch[1];
      const oldExpense = await db.expenses.get(expenseId);
      if (!oldExpense) throw new Error("Expense not found locally");

      const newExpense = {
        ...oldExpense,
        ...data,
        updated_at: timestamp,
      };

      await syncService.registerMutation(
        "expenses",
        "update",
        expenseId,
        data
      );

      return newExpense;
    }

    // 17. Delete Expense
    if (expenseEditMatch && method === "DELETE") {
      const expenseId = expenseEditMatch[1];
      await syncService.registerMutation("expenses", "delete", expenseId, null);
      return { detail: "Deleted successfully" };
    }

    throw new Error(
      `Offline write handler not implemented for ${method} URL: ${url}`,
    );
  }
}

export const offlineInterceptor = new OfflineInterceptor();
