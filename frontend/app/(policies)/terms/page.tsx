"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Mail, HelpCircle } from "lucide-react";
import HomeFooter from "@/components/layout/HomeFooter";
import HomeNavbar from "@/components/layout/HomeNavbar";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col justify-between overflow-hidden">
      {/* Decorative Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />

      {/* Header */}
      <HomeNavbar prop="Terms of Service" />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 relative z-10">
        <div className="bg-card/30 backdrop-blur-lg border border-border/50 rounded-2xl p-6 md:p-10 shadow-xl shadow-background/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Terms of Service
              </h1>
              <p className="text-sm text-muted-foreground">
                Last updated: June 3, 2026
              </p>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">1.</span> Agreement to
                Terms
              </h2>
              <p className="leading-relaxed">
                By accessing or using Quantum Stack, you agree to be bound by
                these Terms of Service. If you do not agree to all of these
                terms, you are prohibited from using the platform and must
                discontinue use immediately.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">2.</span> Account
                Registration
              </h2>
              <p className="leading-relaxed">
                To access certain features of the platform, you must register
                for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Provide accurate, current, and complete information during the
                  registration process.
                </li>
                <li>
                  Maintain the security of your password and accept all risks of
                  unauthorized access to your account.
                </li>
                <li>
                  Promptly notify us if you discover or suspect any security
                  breaches related to the platform.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">3.</span> Acceptable Use
              </h2>
              <p className="leading-relaxed">
                You may use our platform solely for lawful purposes associated
                with business inventory coordination. You are prohibited from:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Using the platform in any manner that could disable,
                  overburden, or damage our systems.
                </li>
                <li>
                  Attempting to gain unauthorized access to other accounts or
                  databases.
                </li>
                <li>
                  Using any automated system (crawlers, bots) to extract data
                  from the platform.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">4.</span> Limitation of
                Liability
              </h2>
              <p className="leading-relaxed">
                Quantum Stack is provided "as is" and "as available". We do not
                guarantee uninterrupted, secure, or error-free operations. To
                the maximum extent permitted by law, in no event shall Quantum
                Stack or its affiliates be liable for any direct, indirect,
                incidental, or consequential damages resulting from your use or
                inability to use the platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">5.</span> Termination
              </h2>
              <p className="leading-relaxed">
                We reserve the right to suspend or terminate your account and
                access to the platform at our sole discretion, without notice,
                for conduct that we believe violates these Terms of Service or
                is harmful to other users or our business interests.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
                <span className="text-primary text-lg">6.</span> Contact
                Information
              </h2>
              <p className="leading-relaxed">
                If you have any questions or require clarifications regarding
                these Terms of Service, please reach out to our compliance team:
              </p>
              <div className="flex items-center gap-2 mt-2 p-4 bg-muted/30 border border-border/30 rounded-lg">
                <Mail size={18} className="text-primary" />
                <span className="text-foreground">support@qstack.com.ng</span>
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
