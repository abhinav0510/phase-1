"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";

export function TopSearch({ action }: { action: string }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <form
      action={action}
      className={cn(
        "flex h-10 items-center rounded-full border border-navy-100 bg-white transition-all duration-200",
        open ? "w-64 pl-3 pr-1 shadow-sm" : "w-10 justify-center",
      )}
    >
      {open ? (
        <>
          <Search className="h-4 w-4 shrink-0 text-navy-400" />
          <input
            ref={inputRef}
            name="q"
            placeholder="Search startups…"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-navy-800 outline-none placeholder:text-navy-400"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="flex h-8 w-8 items-center justify-center rounded-full text-navy-400 hover:bg-navy-50 hover:text-navy-800"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          className="flex h-full w-full items-center justify-center rounded-full text-navy-500 hover:bg-navy-50 hover:text-navy-800"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
      )}
    </form>
  );
}
