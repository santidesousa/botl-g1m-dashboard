import { ACCOUNTS } from "@/lib/accounts";
import { getAdAccount } from "@/lib/meta";
import { tokenErrorPage, tokenPage } from "@/lib/tokenPage";

const GRAPH = "https://graph.facebook.com/v21.0";

// GET /api/auth/meta/callback?code=...&state=...
// Meta redirige aca despues de aceptar los permisos. El token NO se guarda
// en una cookie: se muestra en pantalla para copiarlo a Vercel.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return tokenErrorPage("Meta canceló la conexión", searchParams.get("error_description") || errorParam);
  }

  const savedState = request.cookies.get("meta_oauth_state")?.value;
  if (!code || !state || state !== savedState) {
    return tokenErrorPage(
      "No se pudo validar el login",
      "El parámetro state no coincide (el link venció o se abrió en otro navegador). Volvé a entrar a /api/auth/meta."
    );
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  // 1) Intercambiar el "code" por un access token de corta duracion
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString(), { cache: "no-store" });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return tokenErrorPage("Error obteniendo el token", tokenData?.error?.message || "Respuesta inválida de Meta");
  }

  // 2) Cambiarlo por uno de larga duracion (~60 dias)
  const longLivedUrl = new URL(`${GRAPH}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", tokenData.access_token);

  const longLivedRes = await fetch(longLivedUrl.toString(), { cache: "no-store" });
  const longLivedData = await longLivedRes.json();

  const token = longLivedData.access_token || tokenData.access_token;
  const expiresIn = longLivedData.expires_in || tokenData.expires_in;

  // 3) Chequeo: el token tiene que ver las dos cuentas del panel.
  const checks = await Promise.all(
    ACCOUNTS.map((a) =>
      getAdAccount(token, a.id)
        .then((info) => ({ ...a, ok: true, name: info.name }))
        .catch(() => ({ ...a, ok: false }))
    )
  );
  const missing = checks.filter((c) => !c.ok);

  const expires = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const notes = [];
  if (missing.length) {
    notes.push(
      `<b>Atención:</b> este usuario de Facebook no puede ver ${missing
        .map((m) => `${m.label} (<code>${m.id}</code>)`)
        .join(" ni ")}. Esa pestaña va a mostrar error hasta que conectes con un usuario que tenga acceso.`
    );
  }
  if (expires) {
    notes.push(
      `Este token vence el <b>${expires}</b>. Antes de esa fecha, volvé a entrar a <code>/api/auth/meta</code> y actualizá la variable. Para no tener que renovarlo, se puede usar un token de <b>usuario del sistema</b> de Business Manager (no vence).`
    );
  }

  const ok = checks.filter((c) => c.ok).map((c) => `${c.label}: "${c.name}"`);
  const res = tokenPage({
    title: "Token de Meta Ads",
    intro: `${ok.length ? `Cuentas verificadas → ${ok.join(" · ")}. ` : ""}Copiá este valor a las Environment Variables de Vercel.`,
    fields: [{ name: "META_ACCESS_TOKEN", label: "Access token", value: token }],
    note: notes.length ? notes.join("<br><br>") : undefined,
  });
  res.headers.append("Set-Cookie", "meta_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  return res;
}
