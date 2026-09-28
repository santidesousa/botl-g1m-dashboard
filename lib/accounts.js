// Cuentas publicitarias del panel. Cada una tiene su propia pestana
// (/dashboard/<slug>) y se consulta por separado: nunca se suman ni mezclan.
// El servidor rechaza cualquier cuenta que no este en esta lista, aunque el
// token de Meta tenga acceso a otras.
export const ACCOUNTS = [
  { slug: "botl", label: "BOTL", id: "act_1369377041983871" },
  { slug: "g1m", label: "G1M", id: "act_1613493609949175" },
];

export const DEFAULT_ACCOUNT = ACCOUNTS[0];

/** Cuenta por slug ("botl" / "g1m"), o null */
export function getAccountBySlug(slug) {
  return ACCOUNTS.find((a) => a.slug === slug) || null;
}
