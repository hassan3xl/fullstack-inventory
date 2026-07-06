"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { useSync } from "@/contexts/SyncContext";
import { Menu, Search, Package, X, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { AccountDropdown } from "./AccountDropdown";
import { useBusinessConfig } from "@/lib/hooks/useBusinessConfig";
import Link from "next/link";
import Image from "next/image";
import NotificationButton from "./NotificationButton";
import CartButton from "./CartButton";
import NotificationPanel from "./NotificationPanel";

export function Navbar() {
  const { toggleSidebar, closeSidebar, isOpen } = useSidebar();
  const { config, storeInfo } = useBusinessConfig();
  const { isOnline, isSyncing } = useSync();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  console.log("config", config);
  console.log("storeInfo", storeInfo);

  return (
    <>
      <nav className="bg-muted border-b border-border fixed top-0 left-0 right-0 z-50">
        <div className="w-full">
          <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
            {/* LEFT - Logo & Menu */}
            <div className="flex items-center gap-4">
              {isOpen && (
                <Button
                  onClick={closeSidebar}
                  size="icon"
                  className="lg:hidden"
                  aria-label="Toggle sidebar"
                >
                  <X size={24} />
                </Button>
              )}
              {!isOpen && (
                <Button
                  onClick={toggleSidebar}
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Toggle sidebar"
                >
                  <Menu size={24} />
                </Button>
              )}

              <Link href="/" className="flex items-center gap-2">
                {storeInfo?.logo ? (
                  <div className="relative w-8 h-8 rounded-md overflow-hidden border border-border shadow-xs">
                    <Image
                      src={storeInfo.logo}
                      alt={storeInfo.name || "Store Logo"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <Package className="text-primary h-7 w-7" />
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <h1 className="text-xl capitalize font-black text-foreground hidden sm:block tracking-tighter">
                    {storeInfo?.name} Inventory
                  </h1>
                </div>
              </Link>
            </div>

            {/* RIGHT - Account & System */}
            <div className="flex items-center gap-3">
              {/* Connection Status Badge */}
              <div className="flex items-center">
                {isSyncing ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-xs animate-pulse">
                    <Loader2 size={12} className="animate-spin" />
                    <span className="hidden sm:block">Syncing</span>
                  </div>
                ) : !isOnline ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs">
                    <WifiOff size={12} />
                    <span className="hidden sm:block">Offline</span>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-xs">
                    <Wifi size={12} />
                    <span className="hidden sm:block">Online</span>
                  </div>
                )}
              </div>
              <CartButton />
              <NotificationButton
                onClick={() => setIsNotificationsOpen(true)}
              />
              <div className="h-6 w-px bg-border mx-1" />
              <AccountDropdown />
            </div>
          </div>
        </div>
      </nav>
      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </>
  );
}
