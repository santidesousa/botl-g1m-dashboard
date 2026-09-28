import { NextResponse } from "next/server";
import crypto from "crypto";

// Sin esto Next lo prerenderiza en el build y el state quedaria fijo.
export const dynamic = "force-dynamic";

// GET /api/auth/meta
// Redirige a la pantalla de login/permisos de Meta. Se usa UNA vez, para
// obtener el token que despues va en META_ACCESS_TOKEN (no hay boton en el
// panel: se entra a esta URL a mano).
export async function GET() {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  const scopes = process.env.META_SCOPES || "ads_management,ads_read,business_management";

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: "Falta configurar META_APP_ID o META_REDIRECT_URI" },
      { status: 500 }
    );
  }

  // state evita ataques CSRF: se guarda en una cookie y se compara al volver.
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  return res;
}
