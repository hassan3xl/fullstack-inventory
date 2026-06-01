"use client";
import React, { useEffect, useRef } from "react";
import {
  Home,
  Package,
  ShoppingBag,
  TrendingUp,
  Settings,
  HelpCircle,
  X,
  Tag,
  Star,
  Users,
  ShoppingCart,
  History,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGetInventoryStats } from "@/lib/hooks/product.hook";
import { formatNaira } from "@/lib/utils";

export default function Sidebar() {
  const { isOpen, closeSidebar } = useSidebar();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const { data: stats } = useGetInventoryStats();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  // Role/Permission-based guards
  const permissions = user?.permissions;
  const isBusinessAdmin = user?.role === "is_owner" || permissions?.is_admin;

  const canViewCategories = isBusinessAdmin || permissions?.is_manager;
  const canViewStaff =
    isBusinessAdmin || permissions?.is_admin || permissions?.is_owner;
  const canViewSettings =
    isBusinessAdmin || permissions?.is_admin || permissions?.is_owner;
  const canViewPOS = isBusinessAdmin || permissions?.is_cashier;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) closeSidebar();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeSidebar]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`fixed lg:sticky top-0 lg:top-16 left-0 
          h-screen lg:h-[calc(100vh-4rem)]
          bg-card/80 border-r border-border/50 shadow-lg lg:shadow-none
          transition-transform duration-300 z-40
          ${isOpen ? "translate-x-0 mt-8" : "-translate-x-full lg:translate-x-0"}
          w-64 flex flex-col self-start
        `}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain pt-8 px-4 space-y-8 scrollbar-hide">
          {/* Control Center */}
          <div>
            <div className="space-y-1 mt-2">
              <Link
                href="/"
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                  isActive("/")
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "hover:bg-accent/50 text-foreground"
                }`}
              >
                <Home size={18} />
                <span className="font-bold text-sm tracking-tight">
                  Dashboard
                </span>
              </Link>

              <Link
                href="/products"
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                  isActive("/products")
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "hover:bg-accent/50 text-foreground"
                }`}
              >
                <Package size={18} />
                <span className="font-bold text-sm tracking-tight">
                  Products
                </span>
                <span
                  className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isActive("/products")
                      ? "bg-white/20"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {stats?.product_count || 0}
                </span>
              </Link>

              {canViewCategories && (
                <Link
                  href="/categories"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                    isActive("/categories")
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-accent/50 text-foreground"
                  }`}
                >
                  <TrendingUp size={18} />
                  <span className="font-bold text-sm tracking-tight">
                    Categories
                  </span>
                </Link>
              )}

              {canViewStaff && (
                <Link
                  href="/staff"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                    isActive("/staff")
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-accent/50 text-foreground"
                  }`}
                >
                  <Users size={18} />
                  <span className="font-bold text-sm tracking-tight">
                    Staff Management
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* POS & Checkout */}
          {canViewPOS && (
            <div>
              <p className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
                POS & Checkout
              </p>
              <div className="space-y-1">
                <Link
                  href="/pos"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                    isActive("/pos")
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-accent/50 text-foreground"
                  }`}
                >
                  <ShoppingCart size={18} />
                  <span className="font-bold text-sm tracking-tight">
                    New Checkout
                  </span>
                </Link>
                <Link
                  href="/sales"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                    isActive("/sales")
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-accent/50 text-foreground"
                  }`}
                >
                  <History size={18} />
                  <span className="font-bold text-sm tracking-tight">
                    Sales History
                  </span>
                </Link>
              </div>
            </div>
          )}

          {/* CRM & Finance */}
          <div>
            <p className="px-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 mt-4">
              CRM & Finance
            </p>
            <div className="space-y-1">
              <Link
                href="/customers"
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                  isActive("/customers")
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "hover:bg-accent/50 text-foreground"
                }`}
              >
                <Users size={18} />
                <span className="font-bold text-sm tracking-tight">
                  Customers
                </span>
              </Link>
              {isBusinessAdmin && (
                <Link
                  href="/finance"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                    isActive("/finance")
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-accent/50 text-foreground"
                  }`}
                >
                  <TrendingUp size={18} />
                  <span className="font-bold text-sm tracking-tight">
                    Finance
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* System Navigation */}
          <div className="pt-4 border-t border-border/50">
            <div className="space-y-1">
              {canViewSettings && (
                <Link
                  href="/settings"
                  onClick={closeSidebar}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                    isActive("/settings")
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Settings size={18} />
                  <span className="font-bold text-sm tracking-tight">
                    Settings
                  </span>
                </Link>
              )}

              <Link
                href="/docs"
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                  isActive("/docs")
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <HelpCircle size={18} />
                <span className="font-bold text-sm tracking-tight">
                  Documentation
                </span>
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
