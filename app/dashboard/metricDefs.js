import { formatCompactMoney, formatCompactNumber, formatMoney, formatNumber, formatPercent } from "./format";

// Metricas de cuenta de Meta para las tarjetas y el grafico de evolucion
// (formato de cada definicion: ver MetricCards.js). El gasto es neutro: no
// es bueno ni malo en si mismo.
export function metricDefs(currency) {
  const money = (v) => formatMoney(v, currency);
  const compactMoney = (v) => formatCompactMoney(v, currency);
  return {
    spend: { label: "Gasto", color: "#94a3b8", better: null, format: money, axis: compactMoney, kind: "bar" },
    purchaseValue: { label: "Ingresos", color: "#1f8a5f", better: "up", format: money, axis: compactMoney, kind: "bar" },
    roas: { label: "ROAS", color: "#e8910c", better: "up", rightAxis: true, format: (v) => `${v.toFixed(2)}x`, axis: (v) => `${v.toFixed(1)}x` },
    purchases: { label: "Compras", color: "#6366f1", better: "up", format: formatNumber, axis: formatCompactNumber },
    cpa: { label: "CPA", color: "#e0445a", better: "down", format: money, axis: compactMoney },
    aov: { label: "Ticket promedio", short: "AOV", color: "#0f9f8f", better: "up", format: money, axis: compactMoney },
    ctr: { label: "CTR", color: "#2f80d1", better: "up", format: (v) => formatPercent(v, 2), axis: (v) => formatPercent(v, 1) },
    cpc: { label: "CPC", color: "#d9534f", better: "down", format: money, axis: compactMoney },
    cpm: { label: "CPM", color: "#9b5de5", better: "down", format: money, axis: compactMoney },
  };
}

export const CARD_KEYS = ["spend", "purchaseValue", "roas", "purchases", "cpa", "aov", "ctr", "cpc"];
export const EVOLUTION_KEYS = ["spend", "purchaseValue", "roas", "purchases", "cpa", "ctr", "cpc", "cpm", "aov"];
export const EVOLUTION_DEFAULT = ["spend", "purchaseValue", "roas"];
