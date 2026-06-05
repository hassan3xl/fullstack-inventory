"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Mail, Lock, Eye } from "lucide-react";
import HomeFooter from "@/components/layout/HomeFooter";
import HomeNavbar from "@/components/layout/HomeNavbar";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col justify-between overflow-hidden">
      {/* Decorative Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />

      {/* Header */}
      <HomeNavbar prop="Privacy Policy" />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 relative z-10">
        <div className="bg-card/30 backdrop-blur-lg border border-border/50 rounded-2xl p-6 md:p-10 shadow-xl shadow-background/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-sm text-muted-foreground">
                Last updated: June 3, 2026
              </p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">1.</span> Introduction
              </h2>
              <p className="leading-relaxed">
                Welcome to Quantum Stack. We are committed to protecting your
                personal data and respecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                information when you use our inventory management platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">2.</span> Information We
                Collect
              </h2>
              <p className="leading-relaxed">
                We collect information that you provide directly to us when
                setting up an account, coordinating stock, or communicating with
                us. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">
                    Account Information:
                  </strong>{" "}
                  Name, email address, password, store details, and platform
                  role permissions.
                </li>
                <li>
                  <strong className="text-foreground">Inventory Data:</strong>{" "}
                  Product listings, stock counts, transactions, store locations,
                  and financial data related to sales.
                </li>
                <li>
                  <strong className="text-foreground">
                    Communication History:
                  </strong>{" "}
                  Feedback, inquiries, support tickets, and direct messages sent
                  via our platform.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">3.</span> How We Use Your
                Information
              </h2>
              <p className="leading-relaxed">
                We process your information for purposes based on legitimate
                business interests, the fulfillment of our contract with you,
                compliance with our legal obligations, and/or your consent.
                Specifically, we use it to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Facilitate account creation, login processes, and role
                  authentication.
                </li>
                <li>
                  Manage product listings, sales data, stock alert
                  notifications, and staff logs.
                </li>
                <li>
                  Provide customer support, gather feedback, and respond to
                  inquiries.
                </li>
                <li>
                  Ensure security, detect and prevent fraud, and maintain
                  compliance.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">4.</span> Cookies and
                Tracking
              </h2>
              <p className="leading-relaxed">
                We use cookies and similar tracking technologies (like session
                tokens) to maintain your login session and store preferences.
                For detailed information on our cookie usage, please refer to
                our{" "}
                <Link
                  href="/cookie-policy"
                  className="text-primary hover:underline font-semibold"
                >
                  Cookie Policy
                </Link>
                .
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">5.</span> Data Security
              </h2>
              <p className="leading-relaxed">
                We implement appropriate technical and organizational security
                measures designed to protect the security of any personal
                information we process. However, please remember that no
                transmission over the internet can be guaranteed 100% secure.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">6.</span> Contact Us
              </h2>
              <p className="leading-relaxed">
                If you have questions or comments about this Privacy Policy or
                how we handle data, you can reach out to us at:
              </p>
              <div className="flex items-center gap-2 mt-2 p-4 bg-muted/30 border border-border/30 rounded-lg">
                <Mail size={18} className="text-primary" />
                <span className="text-foreground">privacy@qstack.com.ng</span>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <HomeFooter />
    </div>
  );
}
