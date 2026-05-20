/**
 * Admin asset dashboard — view what the openclaw watcher has ingested.
 *
 * TODO(P2): once Neon is wired, this reads from the `assets` table.
 * For now it's a static placeholder so the route exists and Brendon
 * can see the path. Auth gate is TODO — currently anyone with the
 * URL can view (preview-only, behind Vercel password protection).
 */

export default function AdminAssetsPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8 md:p-12">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-3xl font-bold">Asset dashboard</h1>
        <p className="text-neutral-400 mt-2">
          Files routed here from the <code>openclaw media ingestor</code> →
          buckmountain bucket. Polls every 30s.
        </p>
      </header>

      <section className="max-w-5xl mx-auto">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6">
          <p className="text-neutral-500 italic">
            (Stub) Once Neon is provisioned and the watcher's <code>BUCKMOUNTAIN_DASHBOARD_URL</code>
            is set, records will list here grouped by date and tag (jar-shot, strain-still,
            proof-of-life, video-raw). Filter by strain, route (trusted vs cross-folder),
            kind (image/video).
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 text-sm">
          <h2 className="font-semibold mb-2">Watcher status</h2>
          <ul className="space-y-1 font-mono text-neutral-400">
            <li>host: Joshuas-Mac-mini.local</li>
            <li>script: /Users/iamclaw/Library/Application Support/buckmountain-farm/openclaw_watcher.py</li>
            <li>plist: ~/Library/LaunchAgents/com.buckmountain.farm.media-watcher.plist</li>
            <li>log: ~/Library/Logs/buckmountain-farm-watcher.log</li>
            <li>manifest: ~/Library/Application Support/buckmountain-farm/manifest.jsonl</li>
            <li>poll: 30s</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
