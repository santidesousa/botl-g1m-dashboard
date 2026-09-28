"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDateRange } from "./DateRangePicker";
import PageHeader from "./PageHeader";
import MetricCards from "./MetricCards";
import Evolution from "./Evolution";
import Campaigns from "./Campaigns";
import Ads from "./Ads";
import { fetchJson } from "./api";
import { formatCompactNumber, formatDayLabel, formatMoney, formatPercent } from "./format";
import { CARD_KEYS, EVOLUTION_DEFAULT, EVOLUTION_KEYS, metricDefs } from "./metricDefs";
import { emptyMetrics, withRatios } from "@/lib/metaMetrics";
import { addDays } from "@/lib/dateRange";

const NOT_CONNECTED = "No conectado con Meta todavia";

/**
 * Resumen completo de UNA cuenta publicitaria (la de la pestana): tarjetas
 * KPI, evolucion, campanas y, al entrar a una campana, sus anuncios.
 */
export default function AccountDashboard({ account }) {
  const [range, setRange] = useDateRange();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    if (!range) return;
    const requestId = ++latestRequest.current;
    const current = () => requestId === latestRequest.current;
    setData(null);
    setError(null);
    try {
      const d = await fetchJson(`/api/meta/overview?account=${account.slug}&since=${range.since}&until=${range.until}`);
      if (current()) setData(d);
    } catch (err) {
      if (current()) setError(err.message);
    }
  }, [range, account.slug]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title={account.label}
        logo={account.logo}
        subtitle={`Meta Ads · ${data?.account.name || account.id}${data?.account.currency ? ` · ${data.account.currency}` : ""}`}
        range={range}
        onRangeChange={setRange}
        generatedAt={data?.generatedAt}
        onRefresh={load}
      />
      {error && (
        <div className="card">
          <p style={{ color: "var(--danger)", margin: 0 }}>
            {error === NOT_CONNECTED
              ? "Datos no disponibles todavía, contactá al administrador."
              : `No pudimos traer los datos de Meta: ${error}`}
          </p>
        </div>
      )}
      {!error && range && !data && <LoadingSkeleton />}
      {data && <Dashboard key={`${range.since}-${range.until}`} account={account} data={data} range={range} />}
    </div>
  );
}

function Dashboard({ account, data, range }) {
  const [campaignId, setCampaignId] = useState(null);
  const currency = data.account.currency || "ARS";
  const defs = useMemo(() => metricDefs(currency), [currency]);

  const t = useMemo(() => withRatios(data.totals), [data]);
  const p = useMemo(() => (data.previous ? withRatios(data.previous) : null), [data]);
  const campaigns = useMemo(
    () => data.campaigns.map((c) => ({ ...c, m: withRatios(c.metrics || emptyMetrics()) })),
    [data]
  );

  // Serie diaria completa (Meta omite los dias sin actividad).
  const series = useMemo(() => {
    const byDay = Object.fromEntries(data.daily.map((d) => [d.day, d]));
    const out = [];
    for (let day = range.since; day <= range.until; day = addDays(day, 1)) {
      out.push({ day, ...withRatios(byDay[day] || emptyMetrics()) });
    }
    return out;
  }, [data, range]);
  const weekly = useMemo(() => (data.weekly || []).map((w) => ({ ...w, ...withRatios(w) })), [data]);

  const selectedCampaign = campaigns.find((c) => c.id === campaignId) || null;

  // Anuncios de toda la cuenta (se piden aparte para no demorar el resumen).
  const [ads, setAds] = useState(null);
  const [adsError, setAdsError] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchJson(`/api/meta/ads?account=${account.slug}&since=${range.since}&until=${range.until}`)
      .then((d) => alive && setAds(d.ads.map((a) => ({ ...a, m: withRatios(a.metrics) }))))
      .catch((err) => alive && setAdsError(err.message));
    return () => {
      alive = false;
    };
  }, [account.slug, range.since, range.until]);

  function selectCampaign(id) {
    setCampaignId(id);
    if (id) requestAnimationFrame(() => document.getElementById("anuncios")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div>
      <MetricCards defs={defs} keys={CARD_KEYS} current={t} previous={p} series={series} />
      <div className="stat-strip">
        <span>
          Alcance <b>{t.reach ? formatCompactNumber(t.reach) : "—"}</b>
        </span>
        <span>
          Frecuencia <b>{t.frequency ? t.frequency.toFixed(2) : "—"}</b>
        </span>
        <span>
          Impresiones <b>{formatCompactNumber(t.impressions)}</b>
        </span>
        <span>
          Clicks en el enlace <b>{formatCompactNumber(t.linkClicks)}</b>
        </span>
        <span>
          CPM <b>{t.cpm !== null ? formatMoney(t.cpm, currency) : "—"}</b>
        </span>
        <span>
          Conversión click → compra <b>{t.convRate !== null ? formatPercent(t.convRate, 2) : "—"}</b>
        </span>
      </div>
      {p && (
        <div className="section-sub" style={{ marginBottom: 16 }}>
          Variaciones vs. {formatDayLabel(data.previousRange.since)} – {formatDayLabel(data.previousRange.until)}{" "}
          (mismos días inmediatamente anteriores). Verde = mejora. CTR y CPC: sobre clicks en el
          enlace.
        </div>
      )}

      <Evolution defs={defs} toggleKeys={EVOLUTION_KEYS} defaultOn={EVOLUTION_DEFAULT} weekly={weekly} daily={series} />

      <div className="detail-heading" id="detalle">
        <h2>Detalle: campañas y anuncios</h2>
        <div className="section-sub">Todo lo de abajo corresponde al período elegido.</div>
      </div>

      <Campaigns
        campaigns={campaigns}
        totalSpend={t.spend}
        currency={currency}
        selectedId={campaignId}
        onSelect={selectCampaign}
      />

      <Ads
        key={campaignId || "all"}
        ads={ads}
        error={adsError}
        campaigns={campaigns}
        campaign={selectedCampaign}
        currency={currency}
        onClearCampaign={() => setCampaignId(null)}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="metric-cards">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="metric-card skeleton" style={{ height: 150 }} />
        ))}
      </div>
      <div className="card skeleton" style={{ height: 380 }} />
    </div>
  );
}
