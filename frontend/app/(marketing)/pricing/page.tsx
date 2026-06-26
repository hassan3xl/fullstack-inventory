"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  Crown,
  Zap,
  Flame,
  Leaf,
  Layers,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useGetSubscriptionPlans } from "@/lib/hooks/store.hook";
import { formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";

const fallbackPlans = [
  {
    name: "Free",
    slug: "free",
    price: 0,
    max_products: 50,
    max_staff: 3,
    has_customers: true,
    has_analytics: false,
  },
  {
    name: "Plus",
    slug: "plus",
    price: 2500,
    max_products: -1,
    max_staff: -1,
    has_customers: true,
    has_analytics: true,
  },
  {
    name: "Pro",
    slug: "pro",
    price: 7500,
    max_products: 500,
    max_staff: 10,
    has_customers: true,
    has_analytics: true,
  },
  {
    name: "Premium",
    slug: "premium",
    price: 15000,
    max_products: -1,
    max_staff: -1,
    has_customers: true,
    has_analytics: true,
  },
];

const faqs = [
  {
    question: "What happens when I hit my product or staff limit?",
    answer:
      "Our system keeps your inventory safe, but will temporarily prevent you from adding new items or staff members until you upgrade. You can upgrade to a higher tier plan anytime to instantly unlock more capacity.",
  },
  {
    question: "Can I change my plan or cancel at any time?",
    answer:
      "Yes, you can upgrade, downgrade, or switch plans directly from your Business Subscription panel. Upgrades are applied instantly, while downgrades take effect at the end of your billing cycle.",
  },
  {
    question: "How does the 'Unlimited' threshold work?",
    answer:
      "Our Plus and Premium plans offer truly unlimited product entries and staff accounts. There are no hidden caps, allowing supermarkets, retail operations, and scaling businesses to operate smoothly.",
  },
  {
    question: "Is my store's financial data secure?",
    answer:
      "Security is our highest priority. All sales entries, stock calculations, and financial reports are protected by advanced server-side access controls and encrypted databases, ensuring only your authorized team members have access.",
  },
];

export default function PricingPage() {
  const { data: apiPlans, isLoading } = useGetSubscriptionPlans();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    "monthly",
  );

  const plans = apiPlans || fallbackPlans;
  const freePlan = plans.find(
    (plan: any) => plan.slug === "free" || plan.price === 0,
  );
  const paidPlans = plans.filter(
    (plan: any) => plan.slug !== "free" && plan.price !== 0,
  );

  const getFeaturesList = (plan: any) => {
    const list = [];
    if (plan.max_products !== undefined) {
      list.push(
        plan.max_products === -1
          ? "Unlimited Products"
          : `Up to ${plan.max_products} Products`,
      );
    }
    if (plan.max_staff !== undefined) {
      list.push(
        plan.max_staff === -1
          ? "Unlimited Staff Accounts"
          : `Up to ${plan.max_staff} Staff Accounts`,
      );
    }
    list.push("Real-time Point of Sale (POS)");
    if (plan.has_customers) {
      list.push("Customer History & Directory");
    }
    if (plan.has_analytics) {
      list.push("Advanced Sales Analytics");
    }
    return list;
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case "free":
        return <Leaf className="w-5 h-5 text-emerald-500" />;
      case "plus":
        return <Flame className="w-5 h-5 text-amber-500 animate-pulse" />;
      case "pro":
        return <Crown className="w-5 h-5 text-primary" />;
      default:
        return <Zap className="w-5 h-5 text-blue-500" />;
    }
  };

  const calculatePrice = (monthlyPrice: number) => {
    if (billingCycle === "annually") {
      // 20% discount on annual plan
      return Math.round(monthlyPrice * 0.8);
    }
    return monthlyPrice;
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-24 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Section */}
      <div className="text-center space-y-5 max-w-3xl mx-auto relative z-10">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text text-transparent leading-none">
          Simple, Transparent Plans
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Centralize your inventory and sales instantly. Start with our free
          tier, and upgrade as your storefront expands. Cancel or switch
          anytime.
        </p>

        {/* Billing Cycle Switcher */}
        <div className="pt-6 flex justify-center items-center">
          <div className="bg-card border border-border/40 p-1.5 rounded-full flex items-center gap-1 relative shadow-inner">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-300 relative z-10 cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annually")}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-300 relative z-10 cursor-pointer flex items-center gap-1.5 ${
                billingCycle === "annually"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annually
              <span className="bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider scale-95">
                -20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Free Plan Card at the Top */}
      {freePlan && (
        <div className="max-w-4xl mx-auto bg-card/35 border border-border/50 rounded-[2.5rem] p-8 sm:p-10 relative z-10 hover:border-border/80 transition-all duration-300 shadow-lg w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info: Name, Price, CTA */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-card border border-border/40 flex items-center justify-center shadow-sm">
                  {getPlanIcon(freePlan.slug)}
                </div>
                <h3 className="text-xl font-black text-foreground capitalize tracking-tight">
                  {freePlan.name}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ideal for independent boutiques, kiosks, and trial setups. Try
                Quantum Stack risk-free.
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-foreground tracking-tight">
                  {formatNaira(calculatePrice(freePlan.price))}
                </span>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                  /forever
                </span>
              </div>
              <Button
                asChild
                variant="outline"
                className="w-full font-bold text-xs uppercase tracking-wider py-5 rounded-xl cursor-pointer hover:bg-accent/60"
              >
                <Link
                  href="/docs?tab=register-app"
                  className="flex items-center justify-center gap-1.5"
                >
                  Get Started Free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            {/* Divider for Desktop */}
            <div className="hidden lg:block lg:col-span-1 h-32 w-px bg-border/40 justify-self-center" />

            {/* Right Info: Features checklist */}
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                Included Features
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                {getFeaturesList(freePlan).map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-emerald-500" />
                    </div>
                    <span className="font-semibold text-foreground/85 leading-tight">
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Paid Plans below the Free Plan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8 relative z-10 w-full">
        {paidPlans.map((plan: any) => {
          const isPlus = plan.slug === "plus";
          const features = getFeaturesList(plan);
          const currentPrice = calculatePrice(plan.price);

          return (
            <div
              key={plan.slug}
              className={`rounded-[2.5rem] border flex flex-col justify-between p-8 transition-all duration-500 relative group overflow-hidden ${
                isPlus
                  ? "bg-gradient-to-b from-primary/10 via-card/90 to-card/40 border-primary/60 shadow-[0_0_50px_rgba(var(--primary-rgb),0.06)] hover:shadow-[0_0_60px_rgba(var(--primary-rgb),0.1)] hover:scale-[1.02]"
                  : "bg-card/35 border-border/50 hover:border-border/80 hover:bg-card/50 hover:shadow-xl hover:scale-[1.01]"
              }`}
            >
              {isPlus && (
                <div className="absolute top-4 right-4 bg-primary/15 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1">
                  Recommended
                </div>
              )}

              <div>
                {/* Header Icon + Name */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-card border border-border/40 flex items-center justify-center shadow-sm">
                    {getPlanIcon(plan.slug)}
                  </div>
                  <h3 className="text-xl font-black text-foreground capitalize tracking-tight">
                    {plan.name}
                  </h3>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed min-h-[40px] mb-6">
                  {plan.slug === "plus"
                    ? "Great for growing grocery stores, pharmacies, and general retail."
                    : plan.slug === "pro"
                      ? "Advanced tools for high-volume and multi-register storefronts."
                      : "Complete scale operations and customized enterprise solutions."}
                </p>

                {/* Price Display */}
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                    {formatNaira(currentPrice)}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                    /mo
                  </span>
                </div>

                <div className="h-px bg-border/40 mb-6" />

                {/* Features Checklists */}
                <ul className="space-y-4 text-xs text-muted-foreground mb-8">
                  {features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                      </div>
                      <span className="font-semibold text-foreground/80 leading-tight">
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <Button
                asChild
                variant={isPlus ? "default" : "outline"}
                className={`w-full font-bold text-xs uppercase tracking-wider py-5 rounded-xl cursor-pointer transition-all duration-300 ${
                  isPlus
                    ? "shadow-lg shadow-primary/20 hover:shadow-primary/30"
                    : "hover:bg-accent/60"
                }`}
              >
                <Link
                  href="/docs?tab=register-app"
                  className="flex items-center justify-center gap-1.5"
                >
                  Get Started{" "}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Feature Matrix / Comparison Table */}
      <div className="bg-card/25 border border-border/40 rounded-[2rem] p-6 sm:p-10 relative z-10 overflow-hidden">
        <div className="mb-6 space-y-1">
          <h3 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> Feature Matrix Breakdown
          </h3>
          <p className="text-xs text-muted-foreground">
            A comprehensive list of features included in each tier for full
            transparency.
          </p>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/40">
                <th className="py-4 font-bold text-muted-foreground">
                  Operational Ability
                </th>
                <th className="py-4 px-4 font-black text-foreground uppercase tracking-wider text-center">
                  Free
                </th>
                <th className="py-4 px-4 font-black text-primary uppercase tracking-wider text-center bg-primary/5 rounded-t-xl">
                  Plus
                </th>
                <th className="py-4 px-4 font-black text-foreground uppercase tracking-wider text-center">
                  Pro
                </th>
                <th className="py-4 px-4 font-black text-foreground uppercase tracking-wider text-center">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-muted-foreground">
              <tr>
                <td className="py-3.5 font-semibold text-foreground">
                  Product Limit
                </td>
                <td className="py-3.5 px-4 text-center">Up to 50</td>
                <td className="py-3.5 px-4 text-center bg-primary/5 font-bold text-foreground">
                  Unlimited
                </td>
                <td className="py-3.5 px-4 text-center">Up to 500</td>
                <td className="py-3.5 px-4 text-center">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 font-semibold text-foreground">
                  Staff Accounts
                </td>
                <td className="py-3.5 px-4 text-center">Up to 3</td>
                <td className="py-3.5 px-4 text-center bg-primary/5 font-bold text-foreground">
                  Unlimited
                </td>
                <td className="py-3.5 px-4 text-center">Up to 10</td>
                <td className="py-3.5 px-4 text-center">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 font-semibold text-foreground">
                  Point of Sale (POS) Terminal
                </td>
                <td className="py-3.5 px-4 text-center">✓</td>
                <td className="py-3.5 px-4 text-center bg-primary/5 text-primary">
                  ✓
                </td>
                <td className="py-3.5 px-4 text-center">✓</td>
                <td className="py-3.5 px-4 text-center">✓</td>
              </tr>
              <tr>
                <td className="py-3.5 font-semibold text-foreground">
                  Barcode / SKU Scanner Support
                </td>
                <td className="py-3.5 px-4 text-center">✓</td>
                <td className="py-3.5 px-4 text-center bg-primary/5 text-primary">
                  ✓
                </td>
                <td className="py-3.5 px-4 text-center">✓</td>
                <td className="py-3.5 px-4 text-center">✓</td>
              </tr>
              <tr>
                <td className="py-3.5 font-semibold text-foreground">
                  Customer Registry & History
                </td>
                <td className="py-3.5 px-4 text-center">✓</td>
                <td className="py-3.5 px-4 text-center bg-primary/5 text-primary">
                  ✓
                </td>
                <td className="py-3.5 px-4 text-center">✓</td>
                <td className="py-3.5 px-4 text-center">✓</td>
              </tr>
              <tr>
                <td className="py-3.5 font-semibold text-foreground">
                  Advanced Sales Analytics
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground/30">
                  —
                </td>
                <td className="py-3.5 px-4 text-center bg-primary/5 text-primary">
                  ✓
                </td>
                <td className="py-3.5 px-4 text-center">✓</td>
                <td className="py-3.5 px-4 text-center">✓</td>
              </tr>
              <tr>
                <td className="py-3.5 font-semibold text-foreground">
                  Database Sandbox Isolation
                </td>
                <td className="py-3.5 px-4 text-center">✓</td>
                <td className="py-3.5 px-4 text-center bg-primary/5 text-primary">
                  ✓
                </td>
                <td className="py-3.5 px-4 text-center">✓</td>
                <td className="py-3.5 px-4 text-center">✓</td>
              </tr>
              <tr>
                <td className="py-3.5 font-semibold text-foreground">
                  Dedicated Server Provisioning
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground/30">
                  —
                </td>
                <td className="py-3.5 px-4 text-center bg-primary/5 text-muted-foreground/30">
                  —
                </td>
                <td className="py-3.5 px-4 text-center text-muted-foreground/30">
                  —
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-foreground">
                  ✓
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Reliability Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8 pt-8 border-t border-border/40 relative z-10">
        <div className="flex gap-4 p-6 rounded-[2rem] bg-card/25 border border-border/30 hover:border-border/60 transition-colors duration-300">
          <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-foreground">
              Secure Billing
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All transactions are encrypted and processed securely. Upgrades
              and downgrades are prorated instantly.
            </p>
          </div>
        </div>
        <div className="flex gap-4 p-6 rounded-[2rem] bg-card/25 border border-border/30 hover:border-border/60 transition-colors duration-300">
          <Sparkles className="w-8 h-8 text-emerald-500 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-foreground">Zero Downtime</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Switching plans happens in real-time. Your active cashier
              registers and products database will not be interrupted.
            </p>
          </div>
        </div>
        <div className="flex gap-4 p-6 rounded-[2rem] bg-card/25 border border-border/30 hover:border-border/60 transition-colors duration-300">
          <HelpCircle className="w-8 h-8 text-blue-500 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-foreground">
              Onboarding Support
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our support team is here to assist with store onboarding, setup
              configurations, and custom requirements.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto space-y-8 pt-12 relative z-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Answers to common questions about our subscription pricing model.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className="bg-card/35 border border-border/40 rounded-2xl overflow-hidden transition-all duration-300 hover:border-border/80"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                >
                  <span className="font-bold text-sm text-foreground">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                      isOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-40 border-t border-border/20" : "max-h-0"
                  } overflow-hidden`}
                >
                  <p className="px-6 py-5 text-xs text-muted-foreground leading-relaxed bg-muted/10">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
