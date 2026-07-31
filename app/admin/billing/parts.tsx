"use client";

import { useState } from "react";
import { CloverCardForm } from "@/components/billing/CloverCardForm";

/**
 * Wraps the secure card form so the statement stays calm by default — the
 * fields only appear once someone chooses to add or change a card.
 */
export function CardEditor({ hasCard }: { hasCard: boolean }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          hasCard
            ? "rounded-md border border-neutral-700 px-3 py-2 text-sm hover:border-amber-400/70 hover:text-amber-200 transition"
            : "rounded-md bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-neutral-200 transition"
        }
      >
        {hasCard ? "Update card" : "Add a card"}
      </button>
    );
  }

  return (
    <div className="w-full">
      <CloverCardForm onDone={() => setOpen(false)} />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-4 text-sm text-neutral-500 hover:text-neutral-200"
      >
        Cancel
      </button>
    </div>
  );
}
