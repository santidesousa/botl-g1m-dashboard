export function formatMoney(value, currency = "ARS") {
  const v = value || 0;
  // Montos chicos (CPC, CPM en USD) con centavos; el resto sin decimales.
  const digits = v !== 0 && Math.abs(v) < 100 ? 2 : 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency || "ARS",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

export function formatPercent(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

/** "2026-09-27" -> "sáb 27 sep" (o "27/9" en modo corto) */
export function formatDayLabel(day, short = false) {
  const [y, m, d] = day.split("-").map(Number);
  if (short) return `${d}/${m}`;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Variacion vs periodo anterior: null si no hay base de comparacion */
export function delta(current, previous) {
  if (previous === null || previous === undefined || previous === 0) return null;
  return (current - previous) / previous;
}

// Abreviatura propia (el "compact" de Intl cambia entre navegadores: "k",
// "mil", "mill."...). Millones como "M" y miles como "mil".
function compact(v) {
  const abs = Math.abs(v);
  const fmt = (n) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
  if (abs >= 1e6) return `${fmt(v / 1e6)} M`;
  if (abs >= 1e4) return `${fmt(v / 1e3)} mil`;
  return null;
}

/** "$ 13,1 M" / "$ 341,5 mil": para KPIs grandes que se leen de un vistazo */
export function formatCompactMoney(value, currency = "ARS") {
  const v = value || 0;
  const c = compact(v);
  if (!c) return formatMoney(v, currency);
  const symbol = currency === "ARS" || !currency ? "$" : currency;
  return `${symbol} ${c}`;
}

export function formatNumber(value) {
  return Math.round(value || 0).toLocaleString("es-AR");
}

export function formatCompactNumber(value) {
  return compact(value || 0) || formatNumber(value);
}

/** "hace 3 min", "hace 2 h" */
export function timeAgo(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (!isFinite(minutes)) return "";
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.round(minutes / 60)} h`;
}
