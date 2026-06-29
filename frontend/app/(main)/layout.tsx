"use client";

import Sidebar from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { BASE_URL } from "@/lib/services/apiService";
import Loader from "@/components/Loader";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        window.location.href = "/login";
      } else if (
        user.role === "platform_admin" ||
        user.permissions?.platform_role === "platform_admin"
      ) {
        // Platform admin has separate panel
      } else if (
        !user.permissions?.store_role &&
        (!(user as any).available_tenants || (user as any).available_tenants.length === 0)
      ) {
        window.location.href = "/onboarding";
      }
    }
  }, [user, loading]);

  const hasNoTenant = user && 
    user.role !== "platform_admin" && 
    user.permissions?.platform_role !== "platform_admin" && 
    !user.permissions?.store_role && 
    (!(user as any).available_tenants || (user as any).available_tenants.length === 0);

  if (
    loading ||
    !user ||
    user.role === "platform_admin" ||
    user.permissions?.platform_role === "platform_admin" ||
    hasNoTenant
  ) {
    return <Loader />;
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 text-foreground">
      <Navbar />

      <div className="flex mt-12 h-[calc(100vh-4rem)]">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mt-4 mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
