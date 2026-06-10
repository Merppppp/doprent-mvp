"use client";

import { useState } from "react";
import BrowseFilters, { type BrowseFiltersProps } from "./BrowseFilters";

export default function MobileFilterDrawer(props: BrowseFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs font-medium text-[var(--ink-2)] cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="20" y2="12" />
          <line x1="12" y1="18" x2="20" y2="18" />
        </svg>
        Filter
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-[var(--bg)] overflow-y-auto p-4 shadow-xl animate-slide-in-left">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-[var(--ink)]">Filter</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-lg text-[var(--ink-3)] bg-transparent border-none cursor-pointer leading-none"
              >
                ✕
              </button>
            </div>
            <BrowseFilters {...props} />
          </div>
        </div>
      )}
    </>
  );
}
