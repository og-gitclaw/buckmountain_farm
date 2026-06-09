/**
 * Diagnostic corner pill — shows which homepage FX flags are currently
 * enabled and lists the URL examples for adding more. Always rendered
 * while the FX flag system is in place; remove with the rest of the
 * diagnostic surface when the troubleshooting is done.
 *
 * Pure server component — no JS shipped. The hint text uses static
 * anchor hrefs so the user can click straight to a tested combination.
 */

import { FX_KEYS, type FxFlags, type FxKey, activeKeys } from "@/lib/homepage-fx";

const FLAG_LABEL: Record<FxKey, string> = {
  "strain-bg": "Strain-cards flower-bud parallax",
  interior: "Inside the room (scrub video)",
  hoop: "Outdoor Hoop Dreams (video)",
  foothills: "A Legacy Cultivation Story (video)",
  bento: "What's Flowering tile grid",
  aurora: "Aurora mesh (FAQ bg)",
  "parallax-bg": "Parallax backdrops (FAQ bg)",
};

export function FxStatusIndicator({ flags }: { flags: FxFlags }) {
  const active = activeKeys(flags);
  const allOn = active.length === FX_KEYS.length;

  return (
    <aside
      aria-label="Homepage FX diagnostic indicator"
      className="fixed top-20 right-4 z-50 max-w-xs rounded-xl border border-amber-400/30 bg-neutral-950/85 backdrop-blur-md px-4 py-3 text-[11px] text-white/85 shadow-lg"
    >
      <p className="uppercase tracking-[0.18em] text-amber-300/90 text-[10px]">
        FX diagnostic
      </p>

      {active.length === 0 ? (
        <p className="mt-1 text-white/70">
          Baseline (only hero). Add a layer:{" "}
          <a className="underline text-amber-200" href="/?fx=strain-bg">
            ?fx=strain-bg
          </a>
        </p>
      ) : allOn ? (
        <p className="mt-1 text-white/80">
          All FX on (<code>?fx=all</code>).{" "}
          <a className="underline text-amber-200" href="/">
            Reset
          </a>
        </p>
      ) : (
        <p className="mt-1 text-white/80">
          On: <code>{active.join(",")}</code>{" "}
          <a className="underline text-amber-200" href="/">
            reset
          </a>
        </p>
      )}

      <ul className="mt-2 space-y-1">
        {FX_KEYS.map((k) => {
          const isOn = flags[k];
          const next = isOn
            ? active.filter((x) => x !== k)
            : [...active, k];
          const href = next.length === 0 ? "/" : `/?fx=${next.join(",")}`;
          return (
            <li key={k} className="flex items-center gap-2">
              <span
                aria-hidden
                className={`inline-block w-2 h-2 rounded-full ${
                  isOn ? "bg-emerald-400" : "bg-neutral-600"
                }`}
              />
              <a
                href={href}
                className="hover:underline"
                title={isOn ? "Click to remove" : "Click to add"}
              >
                <code className="text-amber-200/90">{k}</code>{" "}
                <span className="text-white/50">— {FLAG_LABEL[k]}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[10px] text-white/45">
        <a className="underline text-amber-200/80" href="/?fx=all">
          Enable all
        </a>
        {" · "}
        <a className="underline text-amber-200/80" href="/">
          Baseline
        </a>
      </p>
    </aside>
  );
}
