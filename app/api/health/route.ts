/**
 * GET /api/health
 *
 * Cheap liveness + integration-status check for monitoring tools (Vercel,
 * UptimeRobot, Better Stack). Reports which integrations are configured so
 * a glance tells you where the next 5 minutes of setup will pay off.
 *
 * Never returns secrets — only booleans / hostnames / counts.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "buckmountain.farm",
    timestamp: new Date().toISOString(),
    integrations: {
      // Vercel-Neon integration with a custom prefix (here: "DATABASE") writes
      // DATABASE_POSTGRES_URL (pooled) + DATABASE_URL_UNPOOLED (direct) and
      // omits the bare DATABASE_URL var. Accept any of them so the health
      // check works regardless of how Storage was provisioned.
      database:
        !!process.env.DATABASE_URL ||
        !!process.env.DATABASE_POSTGRES_URL ||
        !!process.env.DATABASE_URL_UNPOOLED ||
        !!process.env.POSTGRES_URL,
      nabis: !!process.env.NABIS_API_KEY,
      alpineiq: !!process.env.ALPINEIQ_API_KEY && !!process.env.ALPINEIQ_UID,
      google_oauth: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
      web_push: !!process.env.PUSH_VAPID_PUBLIC_KEY && !!process.env.PUSH_VAPID_PRIVATE_KEY,
      admin_ingest_token: !!process.env.ADMIN_ASSET_INGEST_TOKEN,
      admin_api_token: !!process.env.ADMIN_API_TOKEN,
      session_secret: !!process.env.SESSION_SECRET,
      blob_storage: !!process.env.BLOB_READ_WRITE_TOKEN,
      metrc: !!process.env.METRC_USER_KEY,
      ses_transactional:
        !!process.env.AWS_ACCESS_KEY_ID &&
        !!process.env.AWS_SECRET_ACCESS_KEY &&
        !!(process.env.AWS_SES_REGION || process.env.AWS_REGION),
    },
  });
}
