"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCompactNumber, formatMoney, formatNumber, formatPercent } from "./format";
import { OBJECTIVES, StatusBadge, campaignGoal, roasClass } from "./Campaigns";

const dash = (v, fmt) => (v === null || v === undefined ? "—" : fmt(v));

/**
 * Como se mide cada tipo de campana (ver campaignGoal):
 * - reach: gana la creatividad con mayor alcance.
 * - sales (ventas y remarketing): gana la que mas vende.
 * Nada se pinta en rojo: las cuentas recien arrancan.
 */
const GOALS = {
  reach: {
    label: "Campaña de alcance: se mide por la creatividad con mayor alcance.",
    topTag: "Mayor alcance",
    sorts: [
      { key: "reach", label: "Alcance" },
      { key: "impressions", label: "Impresiones" },
      { key: "cpm", label: "CPM", asc: true },
      { key: "spend", label: "Inversión" },
      { key: "ctr", label: "CTR" },
    ],
    summary: (m, c) => [
      ["Alcance", dash(m.reach, formatCompactNumber), true],
      ["Impresiones", formatCompactNumber(m.impressions)],
      ["Frecuencia", dash(m.frequency, (v) => v.toFixed(2))],
      ["CPM", dash(m.cpm, (v) => formatMoney(v, c))],
      ["Inversión", formatMoney(m.spend, c)],
      ["CTR", m.impressions ? formatPercent(m.ctr, 2) : "—"],
    ],
    card: (m, c) => [
      ["Alcance", dash(m.reach, formatNumber), m.reach > 0],
      ["Impresiones", formatNumber(m.impressions)],
      ["Frecuencia", dash(m.frequency, (v) => v.toFixed(2))],
      ["CPM", dash(m.cpm, (v) => formatMoney(v, c))],
      ["Inversión", formatMoney(m.spend, c)],
      ["CTR", formatPercent(m.ctr, 2)],
    ],
  },
  sales: {
    label: "Campaña de ventas / remarketing: se mide por la creatividad que más vende.",
    topTag: "Más ventas",
    sorts: [
      { key: "purchases", label: "Compras" },
      { key: "purchaseValue", label: "Ingresos" },
      { key: "roas", label: "ROAS" },
      { key: "spend", label: "Inversión" },
      { key: "ctr", label: "CTR" },
    ],
    summary: (m, c) => [
      ["Compras", formatNumber(m.purchases), m.purchases > 0],
      ["Ingresos", m.hasPurchaseValue ? formatMoney(m.purchaseValue, c) : "—"],
      ["ROAS", dash(m.roas, (v) => `${v.toFixed(2)}x`), roasClass(m.roas) !== ""],
      ["CPA", dash(m.cpa, (v) => formatMoney(v, c))],
      ["Inversión", formatMoney(m.spend, c)],
      ["CTR", m.impressions ? formatPercent(m.ctr, 2) : "—"],
    ],
    card: (m, c) => [
      ["Compras", formatNumber(m.purchases), m.purchases > 0],
      ["Ingresos", m.hasPurchaseValue ? formatMoney(m.purchaseValue, c) : "—"],
      ["ROAS", dash(m.roas, (v) => `${v.toFixed(2)}x`), roasClass(m.roas) !== ""],
      ["CPA", dash(m.cpa, (v) => formatMoney(v, c))],
      ["Inversión", formatMoney(m.spend, c)],
      ["CTR", formatPercent(m.ctr, 2)],
    ],
  },
};

// Sin campana elegida se ven los anuncios de toda la cuenta.
const ALL_SORTS = [
  { key: "spend", label: "Inversión" },
  { key: "reach", label: "Alcance" },
  { key: "purchases", label: "Compras" },
  { key: "roas", label: "ROAS" },
  { key: "ctr", label: "CTR" },
];

const FILTERS = [
  // Circulando hoy: anuncio, conjunto y campana activos.
  { key: "ACTIVE", label: "Activos ahora", test: (a) => a.status === "ACTIVE" },
  { key: "ALL", label: "Con actividad", test: (a) => a.m.impressions > 0 || a.m.spend > 0 },
  { key: "SALES", label: "Con ventas", test: (a) => a.m.purchases > 0 },
];

const PAGE = 12;

/**
 * Grilla de creatividades de la cuenta con sus metricas del periodo, debajo
 * de la tabla de campanas. Click en una campana la filtra: ahi se ordena y
 * mide segun el objetivo (alcance o ventas) y se destaca la ganadora.
 * Cada tarjeta muestra las metricas que corresponden a su campana.
 */
export default function Ads({ ads, error, campaigns, campaign, currency, onClearCampaign }) {
  const goal = campaign ? GOALS[campaignGoal(campaign)] : null;
  const sorts = goal ? goal.sorts : ALL_SORTS;
  const campaignById = useMemo(() => Object.fromEntries(campaigns.map((c) => [c.id, c])), [campaigns]);

  const base = useMemo(
    () => (ads || []).filter((a) => !campaign || a.campaignId === campaign.id),
    [ads, campaign]
  );
  // Arranca en lo que esta circulando hoy (si hay algo activo).
  const [filter, setFilter] = useState(() => (base.some((a) => a.status === "ACTIVE") ? "ACTIVE" : "ALL"));
  const [sortKey, setSortKey] = useState(sorts[0].key);
  const [limit, setLimit] = useState(PAGE);
  const [openAd, setOpenAd] = useState(null);

  // Cuando llegan los anuncios (se piden aparte) se recalcula el filtro inicial.
  useEffect(() => {
    if (ads) setFilter(base.some((a) => a.status === "ACTIVE") ? "ACTIVE" : "ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ads]);
  useEffect(() => setLimit(PAGE), [filter, sortKey]);

  const sort = sorts.find((s) => s.key === sortKey) || sorts[0];
  const rows = base
    .filter(FILTERS.find((f) => f.key === filter).test)
    .sort((a, b) => {
      const va = a.m[sort.key];
      const vb = b.m[sort.key];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return sort.asc ? va - vb : vb - va;
    });

  // La creatividad ganadora de la campana (mayor alcance o mas ventas).
  const mainKey = goal?.sorts[0].key;
  const topId = useMemo(() => {
    if (!mainKey) return null;
    const best = base.reduce((b, a) => ((a.m[mainKey] || 0) > (b?.m[mainKey] || 0) ? a : b), null);
    return best?.id || null;
  }, [base, mainKey]);

  const goalFor = (ad) => GOALS[campaignById[ad.campaignId] ? campaignGoal(campaignById[ad.campaignId]) : "sales"];

  return (
    <div className="card" id="anuncios">
      <div className="section-head">
        <div style={{ minWidth: 0 }}>
          <h2>Anuncios</h2>
          <div className="section-sub">
            {campaign
              ? goal.label
              : "Todos los anuncios de la cuenta · click en una campaña de arriba para ver solo los suyos"}
            {" · click en un anuncio para ver el detalle"}
          </div>
        </div>
        <div className="segmented">
          {sorts.map((s) => (
            <button key={s.key} className={sort.key === s.key ? "active" : ""} onClick={() => setSortKey(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {campaign && (
        <>
          <div className="small muted" style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            <StatusBadge status={campaign.status} />
            {OBJECTIVES[campaign.objective] || campaign.objective}
            {campaign.dailyBudget ? ` · ${formatMoney(campaign.dailyBudget, currency)}/día` : ""}
          </div>
          <div className="stat-strip">
            {goal.summary(campaign.m, currency).map(([label, value, good]) => (
              <span key={label} className={good ? "text-good" : ""}>
                {label} <b>{value}</b>
              </span>
            ))}
          </div>
        </>
      )}

      <div className="filter-row" style={{ flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <div
            key={f.key}
            className={"filter-pill" + (filter === f.key ? " active" : "")}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({ads ? base.filter(f.test).length : "…"})
          </div>
        ))}
        {campaign && (
          <div className="filter-chip" onClick={onClearCampaign}>
            Campaña: {campaign.name} <span aria-label="Quitar filtro">×</span>
          </div>
        )}
      </div>

      {error && <p className="muted">No pudimos traer los anuncios: {error}</p>}
      {!error && !ads && (
        <div className="ad-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="ad-card skeleton" style={{ height: 320 }} />
          ))}
        </div>
      )}
      {ads && rows.length === 0 && <div className="empty-state">No hay anuncios con este filtro.</div>}

      <div className="ad-grid">
        {rows.slice(0, limit).map((ad) => (
          <AdCard
            key={ad.id}
            ad={ad}
            campaignName={campaign ? null : campaignById[ad.campaignId]?.name}
            metrics={goalFor(ad).card(ad.m, currency)}
            topTag={ad.id === topId && ad.m[mainKey] > 0 ? goal.topTag : null}
            onClick={() => setOpenAd(ad)}
          />
        ))}
      </div>

      {rows.length > limit && (
        <button className="link-btn" onClick={() => setLimit(limit + PAGE)}>
          Ver más ({rows.length - limit} restantes)
        </button>
      )}

      {openAd && (
        <AdDrawer
          ad={openAd}
          campaignName={campaignById[openAd.campaignId]?.name}
          currency={currency}
          onClose={() => setOpenAd(null)}
        />
      )}
    </div>
  );
}

function AdCard({ ad, campaignName, metrics, topTag, onClick }) {
  return (
    <div className="ad-card" onClick={onClick}>
      <div className="ad-image">
        {ad.image ? <img src={ad.image} alt={ad.name} loading="lazy" /> : <div className="ad-noimage">Sin imagen</div>}
        {ad.isVideo && <span className="ad-video-tag">▶ Video</span>}
        {topTag && <span className="ad-top-tag">★ {topTag}</span>}
      </div>
      <div className="ad-body">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          <div className="ad-name" title={ad.name}>
            {ad.name}
          </div>
          <StatusBadge status={ad.status} />
        </div>
        <div className="small muted ad-campaign" title={campaignName || ad.adsetName || ""}>
          {campaignName || ad.adsetName}
        </div>
        <div className="ad-metrics">
          {metrics.map(([label, value, good]) => (
            <Metric key={label} label={label} value={value} tone={good ? "good" : ""} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className={"metric-value" + (tone ? ` ${tone}` : "")}>{value}</span>
    </div>
  );
}

function AdDrawer({ ad, campaignName, currency, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const m = ad.m;
  const rows = [
    ["Inversión", formatMoney(m.spend, currency)],
    ["Alcance", m.reach !== null && m.reach !== undefined ? Math.round(m.reach).toLocaleString("es-AR") : "—"],
    ["Impresiones", Math.round(m.impressions).toLocaleString("es-AR")],
    ["Frecuencia", m.frequency !== null && m.frequency !== undefined ? m.frequency.toFixed(2) : "—"],
    ["Clicks en el enlace", Math.round(m.linkClicks).toLocaleString("es-AR")],
    ["CTR (enlace)", formatPercent(m.ctr, 2)],
    ["CPC", m.cpc !== null ? formatMoney(m.cpc, currency) : "—"],
    ["CPM", m.cpm !== null ? formatMoney(m.cpm, currency) : "—"],
    ["Compras", m.purchases],
    ["CPA", m.cpa !== null ? formatMoney(m.cpa, currency) : "—"],
    ["Ingresos (valor de compras)", m.hasPurchaseValue ? formatMoney(m.purchaseValue, currency) : "—"],
    ["ROAS", m.roas !== null ? `${m.roas.toFixed(2)}x` : "—"],
    ["Ticket promedio", m.aov !== null ? formatMoney(m.aov, currency) : "—"],
    ["Conversión (click → compra)", m.convRate !== null ? formatPercent(m.convRate, 2) : "—"],
  ];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div style={{ minWidth: 0 }}>
            <h2>{ad.name}</h2>
            <div className="muted small">
              {campaignName}
              {ad.adsetName ? ` · ${ad.adsetName}` : ""}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <StatusBadge status={ad.status} />
        </div>

        {ad.image && <img className="drawer-creative" src={ad.image} alt={ad.name} />}
        {(ad.title || ad.body) && (
          <div className="drawer-block" style={{ marginTop: 10 }}>
            {ad.title && <div className="strong">{ad.title}</div>}
            {ad.body && <div className="muted" style={{ whiteSpace: "pre-line" }}>{ad.body}</div>}
          </div>
        )}
        {ad.link && (
          <div className="small" style={{ marginTop: 6 }}>
            <a href={ad.link} target="_blank" rel="noopener noreferrer">
              Ver destino del anuncio ↗
            </a>
          </div>
        )}

        <h3 className="drawer-title">Métricas del período</h3>
        <div className="drawer-totals mono">
          {rows.map(([label, value]) => (
            <div key={label} className="drawer-row">
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
