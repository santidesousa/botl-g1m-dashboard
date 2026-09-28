// Parseo y calculo de metricas de Meta Ads. Se usa en el servidor (para
// devolver filas livianas) y en el cliente (para ratios y sumas).

// Meta reporta cada evento bajo distintos action_type segun la fuente.
// Tomamos el primero de cada lista que tenga datos, para no duplicar.
const ACTION_TYPES = {
  purchases: ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"],
  addToCart: ["omni_add_to_cart", "add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"],
  checkouts: [
    "omni_initiated_checkout",
    "initiate_checkout",
    "offsite_conversion.fb_pixel_initiate_checkout",
  ],
  viewContent: ["omni_view_content", "view_content", "offsite_conversion.fb_pixel_view_content"],
  landingViews: ["omni_landing_page_view", "landing_page_view"],
};

// Campos que se suman directamente entre filas (dias, campanas, anuncios).
export const ADDITIVE_FIELDS = [
  "spend",
  "impressions",
  "clicks",
  "linkClicks",
  "purchases",
  "purchaseValue",
  "addToCart",
  "checkouts",
  "viewContent",
  "landingViews",
];

function num(v) {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}

function pickAction(list, types) {
  if (!Array.isArray(list)) return null;
  for (const type of types) {
    const match = list.find((a) => a.action_type === type);
    if (match) return { type, value: num(match.value) };
  }
  return null;
}

/**
 * Convierte una fila de insights de la Graph API en metricas planas.
 * purchaseValue se toma del mismo action_type que el conteo de compras.
 */
export function parseInsight(row) {
  if (!row) return null;
  const metrics = {
    spend: num(row.spend),
    impressions: num(row.impressions),
    reach: row.reach !== undefined ? num(row.reach) : null,
    frequency: row.frequency !== undefined ? num(row.frequency) : null,
    clicks: num(row.clicks),
    linkClicks: num(row.inline_link_clicks),
    purchases: 0,
    purchaseValue: 0,
    hasPurchaseValue: false,
  };
  for (const [key, types] of Object.entries(ACTION_TYPES)) {
    const found = pickAction(row.actions, types);
    metrics[key] = found ? found.value : 0;
    if (key === "purchases" && found) {
      const value = (row.action_values || []).find((a) => a.action_type === found.type);
      if (value) {
        metrics.purchaseValue = num(value.value);
        metrics.hasPurchaseValue = true;
      }
    }
  }
  return metrics;
}

export function emptyMetrics() {
  return {
    ...Object.fromEntries(ADDITIVE_FIELDS.map((k) => [k, 0])),
    reach: null,
    frequency: null,
    hasPurchaseValue: false,
  };
}

/** Suma metricas de varias filas (el alcance no es sumable: se descarta) */
export function sumMetrics(list) {
  const total = emptyMetrics();
  for (const m of list) {
    if (!m) continue;
    for (const k of ADDITIVE_FIELDS) total[k] += m[k] || 0;
    if (m.hasPurchaseValue) total.hasPurchaseValue = true;
  }
  return total;
}

// Frecuencia (impresiones por persona) a partir de la cual un anuncio
// suele estar "quemado": la misma gente lo vio demasiadas veces.
export const FATIGUE_FREQUENCY = 3;

/** Agrega ratios: CTR, CPC, CPM, CPA, ROAS, tasa de conversion */
export function withRatios(m) {
  if (!m) return null;
  return {
    ...m,
    ctr: m.impressions ? m.linkClicks / m.impressions : 0,
    cpc: m.linkClicks ? m.spend / m.linkClicks : null,
    cpm: m.impressions ? (m.spend / m.impressions) * 1000 : null,
    cpa: m.purchases ? m.spend / m.purchases : null,
    roas: m.spend && m.hasPurchaseValue ? m.purchaseValue / m.spend : null,
    // Ticket promedio de las compras atribuidas.
    aov: m.purchases && m.hasPurchaseValue ? m.purchaseValue / m.purchases : null,
    convRate: m.linkClicks ? m.purchases / m.linkClicks : null,
    // Gastando sin ninguna compra en el periodo.
    noResults: m.spend > 0 && m.purchases === 0,
    fatigue: m.spend > 0 && m.frequency !== null && m.frequency >= FATIGUE_FREQUENCY,
  };
}
