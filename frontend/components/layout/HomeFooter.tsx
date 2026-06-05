import Link from "next/link";
import React from "react";

const HomeFooter = () => {
  return (
    <footer className="w-full py-6 border-t border-border/40 backdrop-blur-md relative z-10 bg-background/20 mt-12">
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div>
          &copy; {new Date().getFullYear()} Quantum Stack Technologies. All
          rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/terms"
            className="hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/cookie-policy"
            className="hover:text-foreground transition-colors"
          >
            Cookie Policy
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
