import { NextResponse } from "next/server";
import { getAccountBySlug } from "@/lib/accounts";

// Helpers compartidos por las rutas de /api (la carpeta _shared no es ruta).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const NOT_CONNECTED_META = "No conectado con Meta todavia";

export function httpError(message, status, code) {
  return Object.assign(new Error(message), { status, code });
}

export function errorResponse(err) {
  return NextResponse.json(
    { error: err.message, code: err.code, details: err.details },
    { status: err.status || 400 }
  );
}

/**
 * Token de Meta: SOLO desde la variable de entorno META_ACCESS_TOKEN. Se
 * obtiene una vez con /api/auth/meta (el callback lo muestra para copiarlo).
 */
export function requireMetaToken() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw httpError(NOT_CONNECTED_META, 503, "not_connected");
  return token;
}

/** { since, until } validados desde la query, o error 400 */
export function requireRange(request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  if (!DATE_RE.test(since || "") || !DATE_RE.test(until || "")) {
    throw httpError("Parametros since/until invalidos (YYYY-MM-DD)", 400, "bad_request");
  }
  return { since, until };
}

/** Cuenta del panel a partir de ?account=botl|g1m, o error 400 */
export function requireAccount(request) {
  const slug = new URL(request.url).searchParams.get("account");
  const account = getAccountBySlug(slug);
  if (!account) throw httpError("Cuenta publicitaria no permitida en este panel", 400, "bad_account");
  return account;
}
