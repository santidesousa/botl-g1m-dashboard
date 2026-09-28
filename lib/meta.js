const GRAPH_API_VERSION = "v21.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Llama a un endpoint de la Graph API de Meta con el access token.
 * @param {string} path - ej: "/me/adaccounts"
 * @param {string} accessToken
 * @param {Record<string,string>} params - query params adicionales
 */
export async function metaFetch(path, accessToken, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("access_token", accessToken);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data?.error?.message || "Error en Meta Graph API");
    err.details = data;
    throw err;
  }
  return data;
}

/**
 * Como metaFetch, pero sigue paging.next y devuelve todas las filas de data.
 */
export async function metaFetchAll(path, accessToken, params = {}, maxPages = 10) {
  let page = await metaFetch(path, accessToken, params);
  const rows = [...(page.data || [])];
  for (let i = 1; i < maxPages && page.paging?.next; i++) {
    const res = await fetch(page.paging.next);
    page = await res.json();
    if (!res.ok) {
      const err = new Error(page?.error?.message || "Error en Meta Graph API");
      err.details = page;
      throw err;
    }
    rows.push(...(page.data || []));
  }
  return rows;
}

/**
 * Rango de fechas en el formato que espera la Graph API:
 * {"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}
 */
function timeRangeJSON(dateRange) {
  return JSON.stringify({ since: dateRange.since, until: dateRange.until });
}

/** Lista las cuentas publicitarias a las que el token tiene acceso */
export function getAdAccounts(accessToken) {
  return metaFetchAll("/me/adaccounts", accessToken, {
    fields: "id,name,account_status,currency,business",
    limit: "200",
  });
}

/** Nombre, moneda y zona horaria de una cuenta publicitaria */
export function getAdAccount(accessToken, adAccountId) {
  return metaFetch(`/${adAccountId}`, accessToken, {
    fields: "name,currency,timezone_name,account_status",
  });
}

/** Todas las campanas de la cuenta (act_<id>), con estado efectivo */
export function getCampaigns(accessToken, adAccountId) {
  return metaFetchAll(`/${adAccountId}/campaigns`, accessToken, {
    fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget",
    limit: "200",
  });
}

export const INSIGHT_METRICS =
  "spend,impressions,reach,frequency,clicks,inline_link_clicks,actions,action_values";

/**
 * Insights de la cuenta con time_range. `options` admite level
 * (campaign/ad), breakdowns, time_increment y fields extra.
 */
export function getAccountInsights(accessToken, adAccountId, dateRange, options = {}) {
  const { fields, metrics = INSIGHT_METRICS, ...rest } = options;
  return metaFetchAll(`/${adAccountId}/insights`, accessToken, {
    fields: fields ? `${fields},${metrics}` : metrics,
    time_range: timeRangeJSON(dateRange),
    limit: "500",
    ...rest,
  });
}

/**
 * Metricas de una campana (impresiones, clicks, gasto, compras...).
 * @param {{since: string, until: string}} [dateRange]
 */
export function getCampaignInsights(accessToken, campaignId, dateRange) {
  const params = { fields: INSIGHT_METRICS };
  if (dateRange) params.time_range = timeRangeJSON(dateRange);
  return metaFetch(`/${campaignId}/insights`, accessToken, params);
}

/** Id de la cuenta (act_<id>) a la que pertenece una campana */
export async function getCampaignAccountId(accessToken, campaignId) {
  const data = await metaFetch(`/${campaignId}`, accessToken, { fields: "account_id" });
  return `act_${data.account_id}`;
}

const CREATIVE_FIELDS =
  "creative{id,name,title,body,image_url,thumbnail_url,object_url,link_url,video_id,object_story_spec}";

/**
 * Anuncios de una campana, con su creatividad (imagen/video, texto, URL de
 * destino) y sus metricas propias. Si se pasa dateRange, las metricas se
 * calculan para ese periodo.
 * @param {{since: string, until: string}} [dateRange]
 */
export function getAdsWithDetails(accessToken, campaignId, dateRange) {
  const insights = dateRange
    ? `insights.time_range(${timeRangeJSON(dateRange)}){${INSIGHT_METRICS}}`
    : `insights{${INSIGHT_METRICS}}`;
  return metaFetchAll(`/${campaignId}/ads`, accessToken, {
    fields: `id,name,status,effective_status,adset{name},${CREATIVE_FIELDS},${insights}`,
    limit: "100",
  });
}
