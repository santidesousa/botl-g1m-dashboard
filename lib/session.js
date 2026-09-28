// Sesion del panel: cookie firmada con HMAC-SHA256 (Web Crypto, asi que
// funciona tanto en el middleware (Edge) como en rutas de Node).
// Una sola contrasena para todos: DASHBOARD_PASSWORD.

export const SESSION_COOKIE = "bg_session";
export const SESSION_DAYS = 30;

const encoder = new TextEncoder();

function base64url(buffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** true si la contrasena del panel esta configurada */
export function authConfigured() {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

// Si no hay SESSION_SECRET, derivamos uno de la contrasena: cambiarla
// invalida todas las sesiones abiertas, que es lo deseable.
function secret() {
  return process.env.SESSION_SECRET || `bg:${process.env.DASHBOARD_PASSWORD || ""}`;
}

async function sign(data) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

// Comparacion en tiempo constante para no filtrar informacion por timing.
export function safeEqual(a, b) {
  const x = encoder.encode(String(a));
  const y = encoder.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export async function createSessionValue() {
  const expires = String(Date.now() + SESSION_DAYS * 86400000);
  return `${expires}.${await sign(expires)}`;
}

/** true si la cookie es valida y no vencio */
export async function isValidSession(value) {
  if (!value || !authConfigured()) return false;
  const [expires, signature] = value.split(".");
  if (!signature || !(Number(expires) > Date.now())) return false;
  return safeEqual(signature, await sign(expires));
}

export function checkPassword(password) {
  return Boolean(password && authConfigured() && safeEqual(password, process.env.DASHBOARD_PASSWORD));
}
