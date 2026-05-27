/**
 * Neon Postgres client — single source of truth for DB connections.
 *
 * Two entry points:
 *   - `sql` (tagged-template) for one-shot HTTP queries. Cold-start cheap.
 *   - `getPool()` for transactions (claim flow, etc.) over the WebSocket
 *     tunnel. More overhead per request; only use when you actually need
 *     BEGIN/COMMIT.
 *
 * The connection string env var name varies based on how the Neon
 * integration was provisioned. We probe in priority order:
 *   1. DATABASE_URL_UNPOOLED   (direct, what `psql` uses)
 *   2. DATABASE_POSTGRES_URL    (pooled, Vercel-Neon default with prefix)
 *   3. DATABASE_URL              (legacy / no-prefix)
 *   4. POSTGRES_URL              (bare Postgres integrations)
 *
 * `dbConfigured()` lets fail-open routes early-return cleanly when the
 * DB isn't wired yet (preview deploys, dev environments without env).
 */

import { neon, Pool } from "@neondatabase/serverless";

function connStr(): string {
  return (
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

export function dbConfigured(): boolean {
  return !!connStr();
}

type SqlFn = ReturnType<typeof neon>;
let cachedSql: SqlFn | null = null;

/** Tagged-template for one-shot queries. Use for SELECT/INSERT/UPDATE
 *  that don't need a transaction. */
export function getSql(): SqlFn {
  if (!connStr()) throw new Error("database-not-configured");
  if (!cachedSql) cachedSql = neon(connStr());
  return cachedSql;
}

let pool: Pool | null = null;

/** Transaction pool. Returns the same Pool across requests to avoid
 *  WebSocket churn. Caller is responsible for `release()`. */
export function getPool(): Pool {
  if (!connStr()) throw new Error("database-not-configured");
  if (!pool) pool = new Pool({ connectionString: connStr() });
  return pool;
}
