"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import HomeFooter from "@/components/layout/HomeFooter";
import Image from "next/image";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background relative flex flex-col justify-between overflow-hidden">
      {/* Dynamic radial gradient highlights */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] opacity-60 pointer-events-none" />

      {/* Navigation Header */}
      <header className="w-full border-b border-border/40 bg-background/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <Image
              src="/images/logo.svg"
              alt="Q"
              width={32}
              height={32}
              className="rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link
              href="/pricing"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="hover:text-foreground transition-colors"
            >
              Documentation
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Button
                asChild
                size="sm"
                className="font-bold text-xs uppercase tracking-wider px-5 py-5 rounded-xl cursor-pointer"
              >
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Button
                  asChild
                  size="sm"
                  className="font-bold text-xs uppercase tracking-wider px-5 py-5 rounded-xl cursor-pointer"
                >
                  <Link href="/docs?tab=register-app">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Sheet */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border/40 bg-background/95 backdrop-blur-lg px-4 pt-2 pb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-4 text-sm font-bold text-muted-foreground">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="/terms"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-foreground transition-colors"
              >
                Terms
              </Link>
            </nav>
            <div className="pt-4 border-t border-border/40 flex flex-col gap-3">
              {user ? (
                <Button asChild className="w-full font-bold">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full font-bold"
                  >
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full font-bold">
                    <Link
                      href="/docs?tab=register-app"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Get Started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 w-full">
        {children}
      </main>

      {/* Footer */}
      <HomeFooter />
    </div>
  );
}
