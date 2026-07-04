"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "../ui/button";
import {
  User,
  LogOut,
  ShoppingBag,
  User2,
  CreditCard,
  CreditCardIcon,
  Settings2,
  LayoutDashboard,
  Plus,
  Loader2,
  GitBranch,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import SignoutButton from "../auth/SignoutButton";
import BaseModal from "@/components/modals/BaseModal";
import { NormalInput } from "@/components/ui/input";
import {
  apiService,
  getBackendErrorMessage,
  BASE_URL,
} from "@/lib/services/apiService";
import { setActiveTenantCookie } from "@/lib/actions/auth.actions";
import { toast } from "sonner";

const getRoleBadgeStyle = (role: string) => {
  switch (role?.toLowerCase()) {
    case "owner":
      return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    case "admin":
      return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    case "manager":
      return "bg-purple-500/10 text-purple-500 border border-purple-500/20";
    case "cashier":
      return "bg-green-500/10 text-green-500 border border-green-500/20";
    default:
      return "bg-muted text-muted-foreground border border-border/30";
  }
};

export function AccountDropdown() {
  const {
    user,
    loading,
    storeRole,
    platformRole,
    isOwner,
    isAdmin,
    isManager,
    isCashier,
    isStaff,
    isOnline,
  } = useAuth();

  const handleOfflineClick = (e: React.MouseEvent, featureName: string) => {
    e.preventDefault();
    toast.error("Offline Feature", {
      description: `${featureName} is only available online. Please reconnect to access it.`,
    });
  };

  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [businessType, setBusinessType] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("active_tenant_id="));
    if (match) {
      setCurrentTenantId(match.split("=")[1]);
    } else if (user && (user as any).available_tenants?.length > 0) {
      // Default to first tenant
      setCurrentTenantId((user as any).available_tenants[0].id);
    }
  }, [user]);

  const handleSwitchTenant = async (tenantId: string) => {
    try {
      await setActiveTenantCookie(tenantId);
      toast.success("Switching business store...", {
        description: "Redirecting you to the selected business catalog.",
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      toast.error("Failed to switch business store.");
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      toast.error("Branch name is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiService.post("/tenants/branches/create/", {
        name: branchName,
        business_type: businessType,
      });
      if (res && res.branch) {
        toast.success("Branch Created Successfully!", {
          description: res.message,
        });
        setIsBranchModalOpen(false);
        setBranchName("");
        // Switch to the newly created branch
        await setActiveTenantCookie(res.branch.id);
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }
    } catch (error) {
      const msg = getBackendErrorMessage(error);
      toast.error("Failed to create branch", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableTenants = (user as any)?.available_tenants || [];

  return (
    <div>
      {!loading && (
        <>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2.5 hover:bg-accent/85 rounded-xl px-3 h-9 border border-border/50 hover:border-border transition-all duration-200 cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground hover:text-foreground hidden sm:inline transition-colors">
                    {user.first_name?.split(" ")[0] || "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold leading-none">
                        {user.first_name || "User"}
                      </p>
                      {storeRole && (
                        <span
                          className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0 ${getRoleBadgeStyle(storeRole)}`}
                        >
                          {storeRole}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/account"
                      onClick={(e) => !isOnline && handleOfflineClick(e, "Account profile")}
                      className={`cursor-pointer flex items-center gap-2 ${!isOnline ? "opacity-50" : ""}`}
                    >
                      <User className="h-4 w-4" />
                      Account {!isOnline && " (Online Only)"}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard"
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/store"
                      onClick={(e) => !isOnline && handleOfflineClick(e, "Store details")}
                      className={`cursor-pointer flex items-center gap-2 ${!isOnline ? "opacity-50" : ""}`}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Store {!isOnline && " (Online Only)"}
                    </Link>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        onClick={(e) => !isOnline && handleOfflineClick(e, "Settings")}
                        className={`cursor-pointer flex items-center gap-2 ${!isOnline ? "opacity-50" : ""}`}
                      >
                        <Settings2 className="h-4 w-4" />
                        Settings {!isOnline && " (Online Only)"}
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {/* Switch Store Section */}
                  {availableTenants.length > 1 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                        Switch Store / Branch
                      </DropdownMenuLabel>
                      <div className="max-h-36 overflow-y-auto px-1 py-1 space-y-0.5">
                        {availableTenants.map((t: any) => {
                          const isCurrent = t.id === currentTenantId;
                          return (
                            <button
                              key={t.id}
                              onClick={(e) => {
                                if (!isOnline) {
                                  handleOfflineClick(e, "Switching stores");
                                } else {
                                  handleSwitchTenant(t.id);
                                }
                              }}
                              disabled={!isOnline}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left cursor-pointer transition-all ${
                                !isOnline
                                  ? "opacity-30 cursor-not-allowed"
                                  : isCurrent
                                  ? "bg-primary/10 text-primary font-bold"
                                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="truncate max-w-[120px]">
                                {t.name}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${getRoleBadgeStyle(t.role)}`}
                              >
                                {t.role}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Create Branch Option */}
                  {(isOwner || isAdmin || platformRole === "tenant") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          if (!isOnline) {
                            handleOfflineClick(e, "Creating a branch");
                          } else {
                            setIsBranchModalOpen(true);
                          }
                        }}
                        className={`cursor-pointer flex items-center gap-2 font-semibold ${
                          !isOnline ? "opacity-50 text-muted-foreground" : "text-primary focus:text-primary"
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                        Create New Branch {!isOnline && " (Online Only)"}
                      </DropdownMenuItem>
                    </>
                  )}
                </>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  asChild
                  className="cursor-pointer text-red-600 focus:text-red-600 flex items-center gap-2"
                >
                  <SignoutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-9 h-9 p-0 flex items-center justify-center hover:bg-accent/85 rounded-xl border border-border/50 hover:border-border transition-all duration-200 cursor-pointer"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link
                    href="/login"
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Sign In
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/docs?tab=register-app"
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Sign Up
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
      {loading && (
        <div className="h-9 w-24 bg-accent/40 rounded-xl animate-pulse" />
      )}

      {/* Create Branch Modal */}
      <BaseModal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title="Create New Branch"
        description="Deploy a new branch store under your business structure."
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Branch Name
            </label>
            <NormalInput
              required
              placeholder="e.g. Lekki Branch, Gbagada Branch"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Store Category / Type
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="pharmacy">Pharmacy & Medicine</option>
              <option value="electronics">Electronics & Gadgets</option>
              <option value="clothing">Clothing & Apparel</option>
              <option value="general">General Retail</option>
              <option value="other">Other Business</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsBranchModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="font-bold">
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-1.5 h-4 w-4" />
                  Creating...
                </>
              ) : (
                "Create Store"
              )}
            </Button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
}
