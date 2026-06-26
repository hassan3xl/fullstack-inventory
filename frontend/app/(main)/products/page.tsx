"use client";

import React, { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import ProductForm from "@/components/forms/ProductForm";
import ProductCard from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import {
  useGetProducts,
  useGetInventoryStats,
  useGetProductsCategories,
} from "@/lib/hooks/product.hook";
import { Package, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Loading from "@/components/Loader";
import { useBusinessConfig } from "@/lib/hooks/useBusinessConfig";
import { Pagination } from "@/components/ui/Pagination";
import { useGetStore } from "@/lib/hooks/store.hook";
import { toast } from "sonner";

const ProductsInventory: React.FC = () => {
  const { config } = useBusinessConfig();
  const showExpiry = config.features.expiryTracking;
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: store } = useGetStore();

  const maxProductsAllowed = useMemo(() => {
    if (!store) return -1;
    const plan = store.current_plan || {};
    return plan.max_products !== undefined && plan.max_products !== null
      ? plan.max_products
      : plan.slug === "free"
        ? 50
        : -1;
  }, [store]);

  const isLimitReached = useMemo(() => {
    if (!store || maxProductsAllowed === -1) return false;
    return (store.total_products || 0) >= maxProductsAllowed;
  }, [store, maxProductsAllowed]);

  const handleAddProductClick = () => {
    if (isLimitReached) {
      toast.error("Plan Limit Reached", {
        description: `Your subscription plan limits you to a maximum of ${maxProductsAllowed} products. Please upgrade your subscription to add more products.`,
        action: {
          label: "Upgrade Plan",
          onClick: () => {
            window.location.href = "/subscription";
          },
        },
      });
      return;
    }
    setIsModalOpen(true);
  };

  // Set initial filters based on search params
  useEffect(() => {
    if (filterParam) {
      setStockFilter(filterParam);
    }
  }, [filterParam]);

  // Reset page to 1 whenever any filters change to prevent empty state bugs
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterCategory, stockFilter, activeStatusFilter]);

  // Map client-side stockFilter to backend status query parameters
  const statusParam = useMemo(() => {
    if (stockFilter === "low-stock") return "low";
    if (stockFilter === "out-of-stock") return "out_of_stock";
    if (stockFilter === "expiring") return "near_expiry";
    return undefined;
  }, [stockFilter]);

  // Fetch paginated products from server
  const { data, refetch, isLoading } = useGetProducts({
    page,
    page_size: 10,
    search: searchTerm.trim() || undefined,
    category: filterCategory === "all" ? undefined : filterCategory,
    status: statusParam,
    active_status:
      activeStatusFilter === "all" ? undefined : activeStatusFilter,
  });

  // Fetch stats and categories directly from server
  const { data: invStats } = useGetInventoryStats();
  const { data: categoriesData } = useGetProductsCategories();

  const categories = useMemo(() => {
    if (!categoriesData) return [];
    return Array.from(new Set(categoriesData.map((c: any) => c.name)));
  }, [categoriesData]);

  // Read response structure from DRF PageNumberPagination
  const productsArray = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 10);
  const hasPrevious = !!data?.previous;
  const hasNext = !!data?.next;

  const totalProducts = invStats?.product_count || 0;
  const outOfStock = invStats?.out_of_stock || 0;
  const inStock = Math.max(0, totalProducts - outOfStock);
  const lowStock = invStats?.low_stock || 0;
  const expiringSoonCount = invStats?.near_expiry || 0;

  const handleProductUpdate = () => {
    refetch();
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-8 pb-12">
      <ProductForm
        isModalOpen={isModalOpen}
        closeModal={() => setIsModalOpen(false)}
        onProductAdded={handleProductUpdate}
      />

      {totalCount === 0 &&
      searchTerm === "" &&
      filterCategory === "all" &&
      stockFilter === "all" &&
      activeStatusFilter === "all" ? (
        <div className="flex flex-col gap-4 justify-center items-center h-[60vh]">
          <Package className="w-16 h-16 text-muted-foreground/20" />
          <p className="text-muted-foreground font-bold italic">
            Stock database is empty.
          </p>
          <Button
            disabled={isLimitReached}
            onClick={handleAddProductClick}
            className="rounded-lg h-12 px-8 font-black shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLimitReached
              ? "🔒 Product Limit Reached"
              : "Register First Batch"}
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header Section */}
          <Header
            title="System Inventory"
            subtitle="Real-time monitoring and lifecycle tracking"
            stats={[
              { title: "Catalog Size", value: `${totalProducts}` },
              { title: "In Stock", value: `${inStock}` },
              { title: "Critical Stock", value: `${lowStock}` },
              ...(showExpiry
                ? [{ title: "Expiring soon", value: `${expiringSoonCount}` }]
                : []),
            ]}
            actions={
              <Button
                disabled={isLimitReached}
                onClick={handleAddProductClick}
                className="rounded-lg h-12 px-6 font-black shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLimitReached ? "🔒 Product Limit Reached" : "+ Add Product"}
              </Button>
            }
          />

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 bg-card p-6 rounded-xl border border-border/50 shadow-sm">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-transparent rounded-lg focus:bg-background focus:border-primary/20 transition-all text-sm font-medium"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-3 bg-muted/30 border border-transparent rounded-lg focus:bg-background focus:border-primary/20 transition-all text-sm font-bold min-w-[180px]"
            >
              <option value="all">All Classifications</option>
              {categories.map((cat: any) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-4 py-3 bg-muted/30 border border-transparent rounded-lg focus:bg-background focus:border-primary/20 transition-all text-sm font-bold min-w-[180px]"
            >
              <option value="all">All Stock Status</option>
              <option value="in-stock">Available Items</option>
              <option value="low-stock">Critical Levels</option>
              <option value="out-of-stock">Depleted Stock</option>
              {showExpiry && <option value="expiring">Expiring Soon</option>}
            </select>

            <select
              value={activeStatusFilter}
              onChange={(e) => setActiveStatusFilter(e.target.value)}
              className="px-4 py-3 bg-muted/30 border border-transparent rounded-lg focus:bg-background focus:border-primary/20 transition-all text-sm font-bold min-w-[150px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Product Grid */}
          {productsArray.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-8">
                {productsArray.map((product: any) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    merchantView={true}
                  />
                ))}
              </div>

              {/* Navigation component */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                hasPrevious={hasPrevious}
                hasNext={hasNext}
              />
            </>
          ) : (
            <div className="flex flex-col justify-center items-center h-[40vh] bg-muted/5 rounded-[3rem] border border-dashed border-border">
              <p className="text-muted-foreground font-black text-sm uppercase tracking-widest">
                No matching records found in database
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductsInventory;
