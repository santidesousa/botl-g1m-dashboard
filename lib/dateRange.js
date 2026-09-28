// Helpers de rangos de fechas como strings YYYY-MM-DD.

// Se opera en UTC para evitar problemas de cambio de horario.
function parseDay(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatDay(d) {
  return d.toISOString().slice(0, 10);
}
export function addDays(s, n) {
  const d = parseDay(s);
  d.setUTCDate(d.getUTCDate() + n);
  return formatDay(d);
}
export function daysBetween(since, until) {
  return Math.round((parseDay(until) - parseDay(since)) / 86400000) + 1;
}

/** Periodo inmediatamente anterior, de la misma duracion */
export function previousRange({ since, until }) {
  const len = daysBetween(since, until);
  const prevUntil = addDays(since, -1);
  return { since: addDays(prevUntil, -(len - 1)), until: prevUntil };
}
