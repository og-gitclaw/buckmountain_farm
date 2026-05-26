"use client";

/**
 * /strains filter pills — type + family.
 *
 * Pure client-side: filters the prerendered card grid by toggling URL hash
 * fragments (so the back button works). No JS-required for landing; the
 * first render shows everything and these pills layer interactivity on top.
 */

import { useEffect, useState } from "react";

type Props = {
  types: string[];
  families: string[];
};

export function StrainFilters({ types, families }: Props) {
  const [type, setType] = useState<string | null>(null);
  const [family, setFamily] = useState<string | null>(null);

  useEffect(() => {
    // Apply filters to the DOM cards by data-type / data-family attrs the
    // server rendered. Pure CSS class toggles → no React re-render of cards.
    const cards = document.querySelectorAll<HTMLElement>("[data-strain-card]");
    cards.forEach((card) => {
      const cardType = card.getAttribute("data-type");
      const cardFamily = card.getAttribute("data-family");
      const matchesType = !type || cardType === type;
      const matchesFamily = !family || cardFamily === family;
      card.style.display = matchesType && matchesFamily ? "" : "none";
    });
  }, [type, family]);

  return (
    <div className="space-y-3 mb-8">
      <Group
        label="Type"
        items={types}
        active={type}
        onPick={(v) => setType(v === type ? null : v)}
      />
      <Group
        label="Family"
        items={families}
        active={family}
        onPick={(v) => setFamily(v === family ? null : v)}
      />
    </div>
  );
}

function Group({
  label,
  items,
  active,
  onPick,
}: {
  label: string;
  items: string[];
  active: string | null;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-[0.25em] text-white/45 mr-2">
        {label}
      </span>
      {items.map((i) => {
        const on = active === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPick(i)}
            className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded-full border transition ${
              on
                ? "border-amber-500/60 bg-amber-500/10 text-amber-100"
                : "border-white/15 text-white/65 hover:text-white hover:border-white/40"
            }`}
          >
            {i}
          </button>
        );
      })}
    </div>
  );
}
