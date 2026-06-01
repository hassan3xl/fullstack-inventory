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
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import SignoutButton from "../auth/SignoutButton";

import { BASE_URL } from "@/lib/services/apiService";

export function AccountDropdown() {
  const { user, loading, signOut } = useAuth();
  const permissions = user?.permissions;

  const isPlatformAdmin =
    user?.role === "platform_admin" || permissions?.platform_role === "platform_admin";

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
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">
                      {user.first_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {!isPlatformAdmin ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/account"
                        className="cursor-pointer flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        Account
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
                        className="cursor-pointer flex items-center gap-2"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Store
                      </Link>
                    </DropdownMenuItem>

                    {(user?.permissions?.is_owner ||
                      user?.permissions?.is_admin ||
                      user?.role === "is_owner") && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/settings"
                          className="cursor-pointer flex items-center gap-2"
                        >
                          <Settings2 className="h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <a
                      href={
                        BASE_URL
                          ? BASE_URL.replace(/\/api\/?$/, "")
                          : "http://localhost:8000"
                      }
                      className="cursor-pointer flex items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Platform Admin
                    </a>
                  </DropdownMenuItem>
                )}

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
                    href="/register"
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
    </div>
  );
}
