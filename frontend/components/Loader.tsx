"use client";

import { usePathname } from "next/navigation";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { FinanceSkeleton } from "@/components/skeletons/FinanceSkeleton";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { PageSkeleton } from "@/components/skeletons/PageSkeleton";
import { OnboardingSkeleton } from "@/components/skeletons/OnboardingSkeleton";
import { AuthSkeleton } from "@/components/skeletons/AuthSkeleton";

export default function Loader() {
  const pathname = usePathname() || "";

  const getPageSkeleton = () => {
    if (pathname.includes("/onboarding")) {
      return <OnboardingSkeleton />;
    }
    if (
      pathname.includes("/login") ||
      pathname.includes("/register") ||
      pathname.includes("/forgot-password") ||
      pathname.includes("/reset-password") ||
      pathname.includes("/profile-setup")
    ) {
      return (
        <div className="flex items-center justify-center min-h-screen w-full">
          <AuthSkeleton />
        </div>
      );
    }
    if (pathname.includes("/dashboard") || pathname.includes("subscription")) {
      return <DashboardSkeleton />;
    }
    if (pathname.includes("/finance")) {
      return <FinanceSkeleton />;
    }
    if (pathname.includes("/pos")) {
      return <DashboardSkeleton />;
    }
    if (pathname.includes("/account") || pathname.includes("/store")) {
      return <DashboardSkeleton />;
    }
    if (
      pathname.includes("/products") ||
      pathname.includes("/categories") ||
      pathname.includes("/customers") ||
      pathname.includes("/staff")
    ) {
      return <TableSkeleton />;
    }
    return <PageSkeleton />;
  };

  return getPageSkeleton();
}
