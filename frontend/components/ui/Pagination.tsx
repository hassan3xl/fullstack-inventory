"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasPrevious,
  hasNext,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-card border border-border/50 rounded-2xl shadow-xs mt-6">
      {/* Mobile view */}
      <div className="flex flex-1 justify-between sm:hidden items-center">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevious}
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          Previous
        </Button>
        <span className="text-xs font-bold text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          Next
        </Button>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            Showing Page <span className="font-bold text-foreground">{currentPage}</span> of{" "}
            <span className="font-bold text-foreground">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1.5"
            aria-label="Pagination"
          >
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevious}
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-border/50 hover:bg-accent/10 hover:text-accent-foreground disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Dynamic Page Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1
              )
              .map((page, index, array) => {
                const showEllipsis =
                  index > 0 && page - array[index - 1] > 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span className="inline-flex items-center px-3 text-sm text-muted-foreground font-black">
                        ...
                      </span>
                    )}
                    <Button
                      onClick={() => onPageChange(page)}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className={`h-9 w-9 rounded-xl font-bold transition-all duration-200 ${
                        page === currentPage
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "border-border/50 hover:bg-accent/10 hover:text-accent-foreground"
                      }`}
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                );
              })}

            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNext}
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-border/50 hover:bg-accent/10 hover:text-accent-foreground disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
}
