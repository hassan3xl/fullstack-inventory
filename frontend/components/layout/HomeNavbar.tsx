import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

interface HomeNavbarProp {
  prop: string;
}

const HomeNavbar = ({ prop }: HomeNavbarProp) => {
  return (
    <header className="border-b border-border/40 bg-card/20 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        <div className="font-bold tracking-tight text-primary">
          Quantum Stack {prop}
        </div>
      </div>
    </header>
  );
};

export default HomeNavbar;
