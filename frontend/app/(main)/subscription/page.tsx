"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Crown,
  Check,
  CreditCard,
  ArrowLeft,
  Store,
  CalendarDays,
  ShieldCheck,
  Package,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetStore,
  useGetSubscriptionPlans,
  useSubscribeToPlan,
} from "@/lib/hooks/store.hook";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Loader from "@/components/Loader";
import { toast } from "sonner";
import { formatNaira } from "@/lib/utils";

export default function SubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const permissions = user?.permissions;
  const isOwner = permissions?.is_owner || user?.role === "is_owner";
  const isAdmin = permissions?.is_admin;
  const isAuthorized = isOwner || isAdmin;

  const { data: store, isLoading: storeLoading } = useGetStore();
  const { data: plans, isLoading: plansLoading } = useGetSubscriptionPlans();
  const subscribeMutation = useSubscribeToPlan();

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      toast.info("Authentication Required", {
        description:
          "Please sign in or create an account to select a subscription plan.",
      });
      window.location.href = "/login";
      return;
    }

    if (!isAuthorized) {
      toast.error("Access Denied", {
        description:
          "Only store owners and administrators can manage subscriptions.",
      });
      return;
    }

    // Free plan: Subscribe directly
    if (plan.price === 0) {
      try {
        await subscribeMutation.mutateAsync({ planSlug: plan.slug });
        toast.success("Subscription updated successfully", {
          description: `Your store is now on the ${plan.name} plan.`,
        });
      } catch {
        toast.error("Subscription failed", {
          description: "Please try again later.",
        });
      }
      return;
    }

    // Paid plan: Load Paystack script dynamically
    const loadPaystack = () => {
      return new Promise<boolean>((resolve) => {
        if ((window as any).PaystackPop) {
          resolve(true);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://js.paystack.co/v1/inline.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    const loadingId = toast.loading("Initializing Paystack payment gateway...");
    const loaded = await loadPaystack();
    if (!loaded) {
      toast.error("Failed to load payment gateway. Please check your internet connection.", { id: loadingId });
      return;
    }
    toast.dismiss(loadingId);

    try {
      const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_placeholder_key";
      const handler = (window as any).PaystackPop.setup({
        key: paystackKey,
        email: user.email,
        amount: plan.price * 100, // Paystack requires amount in kobo
        currency: "NGN",
        ref: "qstack_" + Math.floor(Math.random() * 1000000000 + 1),
        callback: async function (response: any) {
          const verifyId = toast.loading("Verifying payment transaction...", {
            description: "Please do not close this window."
          });
          try {
            await subscribeMutation.mutateAsync({
              planSlug: plan.slug,
              paymentProvider: "paystack",
              paymentReference: response.reference,
            });
            toast.success("Subscription updated successfully!", {
              id: verifyId,
              description: `Your store is now on the ${plan.name} plan.`
            });
          } catch (err: any) {
            const errorMsg = err.response?.data?.detail || "Please try again or contact support.";
            toast.error("Verification failed", {
              id: verifyId,
              description: errorMsg,
            });
          }
        },
        onClose: function () {
          toast.info("Payment cancelled.");
        },
      });
      handler.openIframe();
    } catch (err) {
      toast.error("Failed to initialize payment process.");
      console.error(err);
    }
  };

  const getPlanFeatures = (plan: any) => {
    const list: string[] = [];

    if (plan.max_products !== undefined && plan.max_products !== null) {
      list.push(
        plan.max_products === -1
          ? "Unlimited Products"
          : `Up to ${plan.max_products} Products`,
      );
    }
    if (plan.max_staff !== undefined && plan.max_staff !== null) {
      list.push(
        plan.max_staff === -1
          ? "Unlimited Staff Members"
          : `Up to ${plan.max_staff} Staff Members`,
      );
    }
    if (plan.has_customers) {
      list.push("Customer Directory & History");
    }
    if (plan.has_analytics) {
      list.push("Real-time Analytics & Finance Reports");
    }
    if (plan.has_ai_integration) {
      list.push("AI Insights & Smart Tags");
    }
    if (plan.has_advanced_reporting) {
      list.push("Advanced Financial & Sales Reports");
    }
    if (plan.has_priority_support) {
      list.push("24/7 Priority Support");
    }
    if (plan.has_subdomain) {
      list.push("Custom Business Subdomain");
    }

    if (list.length === 0) {
      if (plan.slug === "free") {
        return [
          "Up to 50 Products",
          "Up to 3 Staff Members",
          "Basic POS & Checkout",
          "Email Notifications",
        ];
      }
      return [
        "Unlimited Products",
        "Unlimited Staff Members",
        "Advanced POS & Multi-register",
        "Priority Email & Chat Support",
        "Custom Branding & Invoice Logo",
        "Real-time Analytics & Finance Reports",
      ];
    }

    return list;
  };

  const isLoading = authLoading || (user && storeLoading) || plansLoading;

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="">
      <div className="flex-1 w-full">
        <div className="">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-5">
            <div>
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                Subscription Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track your plan status, view feature limits, or upgrade your
                active service.
              </p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Columns: Current plan and available plans */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Active Plan Card */}
              {store && (
                <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Active Subscription
                          </p>
                          <h2 className="text-2xl font-black text-foreground capitalize">
                            {store.current_plan?.name || "Free Plan"}
                          </h2>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/40">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Billing Rate
                        </p>
                        <p className="text-base font-bold text-foreground">
                          {store.current_plan?.price === 0
                            ? "Free Forever"
                            : `${formatNaira(store.current_plan?.price || 0)} / month`}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Started On
                        </p>
                        <p className="text-base font-bold text-foreground">
                          {store.current_plan?.started_at
                            ? new Date(
                                store.current_plan.started_at,
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Renews / Ends On
                        </p>
                        <p className="text-base font-bold text-foreground">
                          {store.current_plan?.ends_at
                            ? new Date(
                                store.current_plan.ends_at,
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "Never (Lifetime Free)"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Auto-Renew
                        </p>
                        <p className="text-base font-bold text-foreground">
                          {store.current_plan?.auto_renew !== undefined
                            ? store.current_plan.auto_renew
                              ? "Enabled"
                              : "Disabled"
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Plans List */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Upgrade or Switch Plan
                </h3>

                {!isAuthorized && (
                  <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl px-4 py-3 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    Only the store owner or business administrator can initiate
                    plan modifications.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {plans
                    ?.filter((plan: any) => {
                      // If user is on a paid plan (not free), hide the free plan
                      const currentIsPaid =
                        store?.current_plan?.slug &&
                        store.current_plan.slug !== "free";
                      if (currentIsPaid && plan.slug === "free") {
                        return false;
                      }
                      return true;
                    })
                    .map((plan: any) => {
                      const isCurrent = store?.current_plan?.slug === plan.slug;
                      const planFeatures = getPlanFeatures(plan);
                      return (
                        <div
                          key={plan.slug}
                          className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                            isCurrent
                              ? "bg-primary/5 border-primary shadow-md"
                              : "bg-card border-border/50 hover:border-border hover:shadow-lg"
                          }`}
                        >
                          {isCurrent && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                              Current Plan
                            </div>
                          )}

                          <div>
                            <h4 className="font-black text-lg text-foreground capitalize mb-1">
                              {plan.name}
                            </h4>
                            <div className="flex items-baseline gap-1 mb-4">
                              <span className="text-3xl font-black text-foreground">
                                {formatNaira(plan.price)}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground">
                                /month
                              </span>
                            </div>

                            <ul className="space-y-2 text-xs text-muted-foreground mb-6">
                              {planFeatures.map((feat) => (
                                <li
                                  key={feat}
                                  className="flex items-center gap-2"
                                >
                                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <Button
                            disabled={
                              isCurrent ||
                              !isAuthorized ||
                              subscribeMutation.isPending
                            }
                            className="w-full font-bold text-xs cursor-pointer"
                            onClick={() => handleSubscribe(plan)}
                          >
                            {subscribeMutation.isPending && !isCurrent
                              ? "Processing..."
                              : isCurrent
                                ? "Active Plan"
                                : "Upgrade"}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Right Column: Limits & Info */}
            <div className="space-y-6">
              {/* Usage Limits Card */}
              {store &&
                (() => {
                  const plan = store.current_plan || {};
                  const maxProducts =
                    plan.max_products !== undefined &&
                    plan.max_products !== null
                      ? plan.max_products
                      : plan.slug === "free"
                        ? 50
                        : -1;
                  const maxStaff =
                    plan.max_staff !== undefined && plan.max_staff !== null
                      ? plan.max_staff
                      : plan.slug === "free"
                        ? 3
                        : -1;
                  const totalProducts = store.total_products || 0;
                  const totalStaff = store.total_staff || 0;

                  const productPercentage =
                    maxProducts === -1
                      ? 100
                      : Math.min(100, (totalProducts / maxProducts) * 100);
                  const staffPercentage =
                    maxStaff === -1
                      ? 100
                      : Math.min(100, (totalStaff / maxStaff) * 100);

                  return (
                    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                          Plan Limitations
                        </h3>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-muted-foreground">
                            <span>Product Catalog Limit</span>
                            <span className="text-foreground">
                              {maxProducts === -1
                                ? `${totalProducts} Products (Unlimited)`
                                : `${totalProducts} / ${maxProducts} Products`}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${productPercentage >= 90 ? "bg-destructive" : productPercentage >= 70 ? "bg-amber-500" : "bg-primary"}`}
                              style={{
                                width: `${productPercentage}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-bold text-muted-foreground">
                            <span>Staff Members Limit</span>
                            <span className="text-foreground">
                              {maxStaff === -1
                                ? `${totalStaff} Staff (Unlimited)`
                                : `${totalStaff} / ${maxStaff} Staff`}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${staffPercentage >= 90 ? "bg-destructive" : staffPercentage >= 70 ? "bg-amber-500" : "bg-primary"}`}
                              style={{
                                width: `${staffPercentage}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-border/40">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                            Additional Features
                          </p>
                          <ul className="text-xs font-bold text-muted-foreground space-y-1">
                            <li className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Point of Sale (POS) Support
                            </li>
                            <li className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${plan.has_customers ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                              />
                              <span
                                className={
                                  plan.has_customers
                                    ? "text-foreground"
                                    : "line-through opacity-60"
                                }
                              >
                                Customer Directory & History
                              </span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${plan.has_analytics ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                              />
                              <span
                                className={
                                  plan.has_analytics
                                    ? "text-foreground"
                                    : "line-through opacity-60"
                                }
                              >
                                Advanced Financial Reports & Analytics
                              </span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${plan.has_ai_integration ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                              />
                              <span
                                className={
                                  plan.has_ai_integration
                                    ? "text-foreground"
                                    : "line-through opacity-60"
                                }
                              >
                                AI Smart Insights & Predictions
                              </span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${plan.has_priority_support ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                              />
                              <span
                                className={
                                  plan.has_priority_support
                                    ? "text-foreground"
                                    : "line-through opacity-60"
                                }
                              >
                                24/7 Priority Support
                              </span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${plan.has_subdomain ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                              />
                              <span
                                className={
                                  plan.has_subdomain
                                    ? "text-foreground"
                                    : "line-through opacity-60"
                                }
                              >
                                Custom Business Subdomain
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Safety Audit Disclaimer */}
              <div className="bg-muted/30 border border-border/40 rounded-2xl p-6 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-widest text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  Secure Subscriptions
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All platform updates are backed by 256-bit encryption. Plan
                  conversions occur instantly, and any differences in prices are
                  prorated automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
