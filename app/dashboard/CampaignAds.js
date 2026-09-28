"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "./api";
import { formatCompactNumber, formatMoney, formatNumber, formatPercent } from "./format";
import { OBJECTIVES, StatusBadge, campaignGoal, roasClass } from "./Campaigns";
import { withRatios } from "@/lib/metaMetrics";

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

const FILTERS = [
  { key: "ALL", label: "Todos", test: () => true },
  { key: "ACTIVE", label: "Activos", test: (a) => a.status === "ACTIVE" },
  { key: "SPEND", label: "Con inversión", test: (a) => a.m.spend > 0 },
];

/**
 * Detalle de una campana: sus anuncios con creatividad y metricas del
 * periodo (se piden a /api/meta/ads al entrar), ordenados segun el objetivo.
 */
export default function CampaignAds({ account, campaign, range, currency, onBack }) {
  const goal = GOALS[campaignGoal(campaign)];
  const [ads, setAds] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(goal.sorts[0].key);
  const [filter, setFilter] = useState("ALL");
  const [openAd, setOpenAd] = useState(null);

  useEffect(() => {
    let alive = true;
    setAds(null);
    setError(null);
    fetchJson(
      `/api/meta/ads?account=${account.slug}&campaignId=${campaign.id}&since=${range.since}&until=${range.until}`
    )
      .then((d) => alive && setAds(d.ads.map((a) => ({ ...a, m: withRatios(a.metrics) }))))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [account.slug, campaign.id, range.since, range.until]);

  const sort = goal.sorts.find((s) => s.key === sortKey);
  const rows = useMemo(
    () =>
      (ads || [])
        .filter(FILTERS.find((f) => f.key === filter).test)
        .sort((a, b) => {
          const va = a.m[sortKey];
          const vb = b.m[sortKey];
          if (va === null || va === undefined) return 1;
          if (vb === null || vb === undefined) return -1;
          return sort.asc ? va - vb : vb - va;
        }),
    [ads, filter, sortKey, sort]
  );

  // La creatividad ganadora segun el criterio principal (alcance o compras).
  const mainKey = goal.sorts[0].key;
  const topId = useMemo(() => {
    const best = (ads || []).reduce((b, a) => ((a.m[mainKey] || 0) > (b?.m[mainKey] || 0) ? a : b), null);
    return best?.id || null;
  }, [ads, mainKey]);

  return (
    <div className="card" id="anuncios">
      <button className="link-btn" onClick={onBack} style={{ marginBottom: 10 }}>
        ← Volver a campañas
      </button>
      <div className="section-head">
        <div style={{ minWidth: 0 }}>
          <h2>{campaign.name}</h2>
          <div className="small muted" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
            <StatusBadge status={campaign.status} />
            {OBJECTIVES[campaign.objective] || campaign.objective}
            {campaign.dailyBudget ? ` · ${formatMoney(campaign.dailyBudget, currency)}/día` : ""}
          </div>
          <div className="section-sub" style={{ marginTop: 4 }}>{goal.label}</div>
        </div>
      </div>

      <div className="stat-strip">
        {goal.summary(campaign.m, currency).map(([label, value, good]) => (
          <span key={label} className={good ? "text-good" : ""}>
            {label} <b>{value}</b>
          </span>
        ))}
      </div>

      {error && <p style={{ color: "var(--muted)" }}>No pudimos traer los anuncios: {error}</p>}
      {!error && !ads && (
        <div className="ad-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="ad-card skeleton" style={{ height: 320 }} />
          ))}
        </div>
      )}

      {ads && (
        <>
          <div className="section-head" style={{ marginTop: 8 }}>
            <div className="filter-row" style={{ flexWrap: "wrap", margin: 0 }}>
              {FILTERS.map((f) => (
                <div
                  key={f.key}
                  className={"filter-pill" + (filter === f.key ? " active" : "")}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} ({ads.filter(f.test).length})
                </div>
              ))}
            </div>
            <div className="segmented">
              {goal.sorts.map((s) => (
                <button key={s.key} className={sortKey === s.key ? "active" : ""} onClick={() => setSortKey(s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {rows.length === 0 && <div className="empty-state">No hay anuncios con este filtro.</div>}

          <div className="ad-grid">
            {rows.map((ad) => (
              <AdCard
                key={ad.id}
                ad={ad}
                metrics={goal.card(ad.m, currency)}
                topTag={ad.id === topId ? goal.topTag : null}
                onClick={() => setOpenAd(ad)}
              />
            ))}
          </div>
        </>
      )}

      {openAd && <AdDrawer ad={openAd} campaignName={campaign.name} currency={currency} onClose={() => setOpenAd(null)} />}
    </div>
  );
}

function AdCard({ ad, metrics, topTag, onClick }) {
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
        <div className="small muted ad-campaign" title={ad.adsetName || ""}>
          {ad.adsetName}
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
