"use client";

/**
 * Nav-mounted strain search.
 *
 * Client-only, zero network: the strain catalog is small (11 rows, ~3KB
 * gzipped) so we ship the full STRAIN_SEARCH_INDEX to the browser and
 * filter in-memory. As soon as the catalog passes ~100 rows we swap
 * this for /api/strains/search with a debounced fetch — the API route
 * already exists.
 *
 * UX:
 *   - Cmd/Ctrl-K opens the search field
 *   - / opens too (when not already typing in an input)
 *   - Esc closes
 *   - Up/Down moves selection
 *   - Enter navigates to the highlighted result
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { STRAIN_SEARCH_INDEX, type StrainSearchEntry } from "@/data/strains";

export function StrainSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typingElsewhere =
        !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (!open && !typingElsewhere && (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"))) {
        e.preventDefault();
        setOpen(true);
      } else if (open && e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setQ("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      // Defer focus so the popover is mounted before we focus.
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const results = filter(q);

  function onResultsKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[hi];
      if (r) window.location.href = `/strains/${r.slug}`;
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Search strains"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/30 px-3 py-1.5 text-xs text-white/60 transition"
      >
        <SearchGlyph />
        <span>Search strains</span>
        <kbd className="ml-2 text-[10px] tracking-wider text-white/40 border border-white/10 rounded px-1.5 py-0.5">
          /
        </kbd>
      </button>
      <button
        type="button"
        aria-label="Search strains"
        onClick={() => setOpen(true)}
        className="md:hidden grid place-items-center h-9 w-9 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition"
      >
        <SearchGlyph />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              setQ("");
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto mt-24 max-w-xl rounded-xl border border-white/10 bg-neutral-950 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <SearchGlyph />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search strains, family, lineage, flavor…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setHi(0);
                }}
                onKeyDown={onResultsKey}
                className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none text-sm"
              />
              <kbd className="text-[10px] tracking-wider text-white/40 border border-white/10 rounded px-1.5 py-0.5">
                Esc
              </kbd>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {results.length === 0 ? (
                <li className="px-4 py-6 text-sm text-white/50 italic">
                  {q.length === 0 ? "Start typing — strain name, family (OG, dessert, fuel), or flavor." : "No strains match that."}
                </li>
              ) : (
                results.map((r, i) => (
                  <li key={r.slug}>
                    <Link
                      href={`/strains/${r.slug}`}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 border-b border-white/5 ${
                        i === hi ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold text-white/95">{r.name}</div>
                        <div className="mt-0.5 text-xs text-white/45">
                          {r.type} · {r.family}
                        </div>
                      </div>
                      <span className="text-xs text-white/30">→</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function filter(q: string): StrainSearchEntry[] {
  const term = q.trim().toLowerCase();
  if (!term) return STRAIN_SEARCH_INDEX.slice(0, 8);
  // Multi-word AND match.
  const words = term.split(/\s+/);
  return STRAIN_SEARCH_INDEX.filter((e) => words.every((w) => e.haystack.includes(w))).slice(0, 12);
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
