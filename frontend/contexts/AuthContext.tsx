"use client";
import { resetAuthCookies } from "@/lib/actions/auth.actions";
import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "@/lib/services/apiService";
import { useIsOffline } from "@/lib/hooks/useIsOffline";

export interface User {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role?: string; // Platform role: 'platform_admin', 'tenant', 'staff'
  permissions?: {
    platform_role: string;
    store_role: string | null; // Store role: 'owner', 'admin', 'manager', 'cashier'
    is_owner: boolean;
    is_admin: boolean;
    is_manager: boolean;
    is_cashier: boolean;
    is_staff: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Computed role helpers matching the backend logic
  storeRole: "owner" | "admin" | "manager" | "cashier" | null;
  platformRole: "tenant" | "staff" | null;

  isOwner: boolean; // Owner only
  isAdmin: boolean; // Owner, Admin
  isManager: boolean; // Owner, Admin, Manager
  isCashier: boolean; // Owner, Admin, Manager, Cashier
  isStaff: boolean; // Any store member (Owner, Admin, Manager, Cashier)
  isOnline: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  storeRole: null,
  platformRole: null,
  isOwner: false,
  isAdmin: false,
  isManager: false,
  isCashier: false,
  isStaff: false,
  isOnline: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  console.log("User", user);

  const fetchUser = async () => {
    try {
      const data = await apiService.get("/auth/user/");
      if (data) {
        setUser(data);
        // Sync back to cookie
        const isLocal = process.env.NODE_ENV !== "production";
        const cookieOptions = `path=/; max-age=${60 * 60 * 24 * 7}; sameSite=lax${isLocal ? "" : "; secure"}`;
        document.cookie = `session_user=${encodeURIComponent(JSON.stringify(data))}; ${cookieOptions}`;
      }
    } catch (err) {
      console.error("Failed to fetch authenticated user profile", err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First check cookie for fast initial load
        const userCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("session_user="));

        if (userCookie) {
          const value = userCookie.split("=")[1];
          const parsed = JSON.parse(decodeURIComponent(value));
          setUser(parsed);
        }

        // Then check if we have access token to load fresh profile & permissions
        const tokenCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("session_access_token="));

        if (tokenCookie) {
          await fetchUser();
        }
      } catch (err) {
        console.error("Auth initialization failed", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signOut = async () => {
    // Clear client-side cookies
    document.cookie = "session_user=; max-age=0; path=/;";
    document.cookie = "session_access_token=; max-age=0; path=/;";
    document.cookie = "active_tenant_id=; max-age=0; path=/;";

    // Clear server-side cookies
    await resetAuthCookies();
    setUser(null);
    window.location.href = "/"; // redirect after logout
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  // Derive exact role computation matching backend checks
  const storeRole = (user?.permissions?.store_role || null) as
    | "owner"
    | "admin"
    | "manager"
    | "cashier"
    | null;

  const platformRole = (user?.role ||
    user?.permissions?.platform_role ||
    null) as "tenant" | "staff" | null;

  // Store roles are cumulative, mirroring TenantUser.ROLE_RANK in backend:
  // owner = 50, admin = 40, manager = 30, cashier = 20
  const isOwner = storeRole === "owner";
  const isAdmin = isOwner || storeRole === "admin";
  const isManager = isAdmin || storeRole === "manager";
  const isCashier = isManager || storeRole === "cashier";
  const isStaff = isCashier; // Cashier or above
  const isOffline = useIsOffline();
  const isOnline = !isOffline;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut,
        refreshUser,
        storeRole,
        platformRole,
        isOwner,
        isAdmin,
        isManager,
        isCashier,
        isStaff,
        isOnline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
