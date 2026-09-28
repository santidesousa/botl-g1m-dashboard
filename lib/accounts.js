// Cuentas publicitarias del panel. Cada una tiene su propia pestana
// (/dashboard/<slug>) y se consulta por separado: nunca se suman ni mezclan.
// El servidor rechaza cualquier cuenta que no este en esta lista, aunque el
// token de Meta tenga acceso a otras.
// Logos sacados de botl.com.ar y g1m.com.ar (recortados, fondo transparente):
// /logos/<slug>.png en oscuro y /logos/<slug>-white.png para el menu.
export const ACCOUNTS = [
  { slug: "botl", label: "BOTL", id: "act_1369377041983871", logo: "/logos/botl.png", logoWhite: "/logos/botl-white.png" },
  { slug: "g1m", label: "G1M", id: "act_1613493609949175", logo: "/logos/g1m.png", logoWhite: "/logos/g1m-white.png" },
];

export const DEFAULT_ACCOUNT = ACCOUNTS[0];

/** Cuenta por slug ("botl" / "g1m"), o null */
export function getAccountBySlug(slug) {
  return ACCOUNTS.find((a) => a.slug === slug) || null;
}
