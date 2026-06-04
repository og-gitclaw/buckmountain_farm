"use client";

/**
 * Site nav — sticky top, backdrop-blur, hides on scroll-down + reveals
 * on scroll-up (mobile-2026 pattern: more screen for content, easy
 * recall when the user reverses direction).
 *
 * Matches the legacy site's "logo top-left + Blog top-right" layout
 * (per screenshot), expanded with the routes our rebuild needs:
 *   - Strains (anchor for /strains/[slug] when wired)
 *   - Store ("Always Grinding" tees + Tech Decks)
 *   - Blog (mirrors the legacy /blog)
 *   - Loyalty (QR-scan opt-in flow)
 *   - Instagram (external link to @buckmountaincannabis)
 *
 * Reduced-motion: scroll-direction hiding is disabled — nav always
 * shows. Backdrop-blur and hover transitions degrade to instant.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { StrainSearch } from "@/components/strain-search";

const LINKS = [
  { href: "/strains", label: "Strains" },
  { href: "/drops", label: "Drops" },
  { href: "/store", label: "Store" },
  { href: "/blog", label: "Blog" },
  { href: "/loyalty", label: "Loyalty" },
];

const INSTAGRAM_URL = "https://www.instagram.com/buckmountaincannabis/";

export function SiteNav() {
  const lastY = useRef(0);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 80) setHidden(false);
        else if (y > lastY.current + 6) setHidden(true);
        else if (y < lastY.current - 6) setHidden(false);
        lastY.current = y;
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <nav className="mx-auto flex items-center justify-between gap-2 md:gap-4 px-3 md:px-8 py-2 md:py-3 backdrop-blur-md bg-black/45 border-b border-white/5">
        <Link
          href="/"
          aria-label="Buck Mountain Cannabis — home"
          className="flex items-center -my-2 md:-my-3 shrink-0"
        >
          {/* Real brand mark (gold antlered deer + purple triangle + BUCK MTN
              wordmark + lavender halo). Source: Buck Mtn New Logo 8.24.23.
              Bumped to h-20 (mobile) / h-28 (desktop) per the "decent sized
              so it doesn't scale down" directive. Negative my- on the Link
              lets the logo extend slightly past the nav padding so the halo
              breathes. */}
          {/* Square logo — explicit `w-N` matched to `h-N` because Next/Image
              with `w-auto` collapses to 0 inside this flex nav. Mobile is
              smaller so the 5 text nav links + search + IG all fit on a
              375px viewport without overflow. */}
          <Image
            src="/brand/logo.png"
            alt="Buck Mountain Cannabis"
            width={480}
            height={480}
            priority
            sizes="(min-width: 768px) 112px, 56px"
            className="h-14 w-14 md:h-28 md:w-28 object-contain"
          />
        </Link>

        <div className="flex items-center gap-0.5 md:gap-3 text-[13px] md:text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-1.5 py-1 md:px-3 text-white/80 hover:text-white transition-colors whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
          <StrainSearch />
          {/* IG hidden below md — at 375px we already fit nav + search; IG
              is duplicated in the footer + still on every page below the fold. */}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Buck Mountain Cannabis on Instagram"
            className="hidden md:grid place-items-center h-9 w-9 rounded-full border border-white/10 text-white/80 hover:text-white hover:border-white/30 transition"
          >
            {/* Simple IG glyph — pure inline SVG, no icon dep */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
            </svg>
          </a>
        </div>
      </nav>
    </header>
  );
}
