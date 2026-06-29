"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Users,
  BellRing,
  Layers,
  Lock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useModal } from "@/providers/ModalProvider";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import SendMessageForm from "@/components/SendMessageForm";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const features = [
  {
    icon: Zap,
    title: "Real-time POS Checkout",
    desc: "Speed up your registers. Process sales, issue receipts, and sync stock in real-time, even during peak rush hours.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: Layers,
    title: "Granular Stock Tracking",
    desc: "Manage multiple batches, expiry dates, purchase records, and low-stock limits from a unified dashboard.",
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    icon: BellRing,
    title: "Smart Capacity Alerts",
    desc: "Get notified instantly when stock drops below threshold or approaches expiration dates to prevent losses.",
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    icon: Users,
    title: "Team & Role Control",
    desc: "Add cashiers, managers, and admins with pre-defined permission controls. Track who processed what sale.",
    color: "text-emerald-500 bg-emerald-500/10",
  },
  {
    icon: BarChart3,
    title: "Financial Reporting",
    desc: "Detailed charts on sales, cost of goods, net margins, and store performance. Export analytics in one click.",
    color: "text-indigo-500 bg-indigo-500/10",
  },
  {
    icon: Lock,
    title: "Multi-Tenant Isolation",
    desc: "Enterprise-grade database sandboxing ensures your business inventory, logs, and customer records remain secure.",
    color: "text-rose-500 bg-rose-500/10",
  },
];

const metrics = [
  { value: "15,000+", label: "Active Stores" },
  { value: "50 Million+", label: "Products Monitored" },
  { value: "99.99%", label: "Uptime SLA" },
  { value: "< 250ms", label: "Query Latency" },
];

export default function MarketingPage() {
  const { openModal } = useModal();
  const { user } = useAuth();
  const router = useRouter();

  const handleLoginClick = () => {
    if (user) {
      router.push("/dashboard");
    } else {
      openModal(<LoginForm />);
    }
  };

  const handleEnquiryClick = () => {
    openModal(<SendMessageForm source="inventory marketing page" />);
  };

  return (
    <div className="w-full space-y-24 py-16 sm:py-24">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/75 bg-clip-text text-transparent max-w-4xl mx-auto leading-none">
          Unified Inventory & Smart POS Control
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Quantum Stack Inventory gives retailers, supermarkets, and pharmacies
          a centralized command center to automate stock control, track
          expiration dates, and coordinate staff.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          {user ? (
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto font-black text-xs uppercase tracking-wider py-6 px-8 rounded-2xl cursor-pointer"
            >
              <Link href="/dashboard">
                Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto font-black text-xs uppercase tracking-wider py-6 px-8 rounded-2xl cursor-pointer"
              >
                <Link href="/docs?tab=register-app">
                  Start for free <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              {/* <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto font-black text-xs uppercase tracking-wider py-6 px-8 rounded-2xl cursor-pointer"
              >
                <Link href="/pricing">View Plans & Pricing</Link>
              </Button> */}
            </>
          )}
        </div>
      </section>

      {/* Trust Metrics Section */}
      <section className="hidden w-full bg-card/30 border-y border-border/40 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {metrics.map((metric, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-3xl sm:text-5xl font-black text-foreground tracking-tight">
                  {metric.value}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Everything your business needs to scale
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Streamlined operations, advanced automation, and granular
            transparency inside a single workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const IconComponent = feat.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl border border-border/50 bg-card/45 hover:border-border hover:bg-card/75 transition-all duration-300 shadow-sm hover:shadow-lg flex flex-col items-start gap-5"
              >
                <div className={`p-3.5 rounded-2xl ${feat.color} shrink-0`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-lg text-foreground">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Access Portal */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur-md p-8 sm:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="space-y-4">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Ready to automate your storefront?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Unlock real-time sales reporting, customer management, and
              expiration tracking instantly. Sign up to get started or request a
              custom setup from our engineers.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button
                size="sm"
                onClick={handleLoginClick}
                className="font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-xl cursor-pointer"
              >
                {user ? "Go to Dashboard" : "Sign In Now"}{" "}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnquiryClick}
                className="font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-xl cursor-pointer"
              >
                Contact Support
              </Button>
            </div>
          </div>

          <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-border/40 pt-6 md:pt-0 md:pl-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Platform Features
            </p>
            <ul className="space-y-2 text-xs font-semibold text-foreground/90">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>99.9% Uptime Guarantee</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>GDPR & Tenant Isolation Verified</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>No Credit Card Required to Start</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Automatic Daily Backups</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
