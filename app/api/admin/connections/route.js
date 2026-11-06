import { NextResponse } from "next/server";
import { checkAccounts, debugMetaToken } from "@/lib/metaToken";
import { vercelSettings } from "@/lib/vercel";

export const dynamic = "force-dynamic";

// GET /api/admin/connections
// Estado del token de Meta (vencimiento, cuentas que ve) y de la
// configuracion, para la pestana Conexiones.
export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;

  const result = {
    meta: { configured: Boolean(token) },
    vercel: vercelSettings(),
    env: {
      metaApp: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
      redirectUri: process.env.META_REDIRECT_URI || null,
      dashboardPassword: Boolean(process.env.DASHBOARD_PASSWORD),
      sessionSecret: Boolean(process.env.SESSION_SECRET),
    },
  };

  if (token) {
    const [tokenInfo, accounts] = await Promise.all([debugMetaToken(token), checkAccounts(token)]);
    result.meta.token = tokenInfo;
    result.meta.accounts = accounts;
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
