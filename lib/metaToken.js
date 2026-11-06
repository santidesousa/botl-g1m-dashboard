import { ACCOUNTS } from "@/lib/accounts";
import { getAdAccount, metaFetch } from "@/lib/meta";

/**
 * Estado de un token de Meta segun /debug_token (necesita META_APP_ID y
 * META_APP_SECRET). Los tokens de usuario duran ~60 dias; los de usuario del
 * sistema no vencen. data_access_expires_at es otro limite (90 dias) a partir
 * del cual Meta deja de devolver datos aunque el token siga vivo.
 */
export async function debugMetaToken(token) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return { error: "Faltan META_APP_ID / META_APP_SECRET para consultar el token" };
  try {
    const { data } = await metaFetch("/debug_token", `${appId}|${appSecret}`, { input_token: token });
    const toIso = (s) => (s ? new Date(s * 1000).toISOString() : null);
    return {
      valid: Boolean(data.is_valid),
      type: data.type || null,
      expiresAt: toIso(data.expires_at),
      neverExpires: data.expires_at === 0,
      dataAccessExpiresAt: toIso(data.data_access_expires_at),
      scopes: data.scopes || [],
      error: data.error?.message || null,
    };
  } catch (err) {
    return { error: err.message };
  }
}

/** Para cada cuenta del panel: si el token la puede leer y su nombre */
export function checkAccounts(token) {
  return Promise.all(
    ACCOUNTS.map((a) =>
      getAdAccount(token, a.id)
        .then((info) => ({ slug: a.slug, label: a.label, id: a.id, ok: true, name: info.name }))
        .catch((err) => ({ slug: a.slug, label: a.label, id: a.id, ok: false, error: err.message }))
    )
  );
}
