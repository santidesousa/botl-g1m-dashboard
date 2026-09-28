"use client";

import { useState } from "react";
import { formatMoney, formatPercent } from "./format";

const STATUS = {
  ACTIVE: { label: "Activa", cls: "badge-active" },
  PAUSED: { label: "Pausada", cls: "badge-paused" },
  CAMPAIGN_PAUSED: { label: "Campaña pausada", cls: "badge-paused" },
  ADSET_PAUSED: { label: "Conjunto pausado", cls: "badge-paused" },
  IN_PROCESS: { label: "Procesando", cls: "badge-other" },
  PENDING_REVIEW: { label: "En revisión", cls: "badge-other" },
  DISAPPROVED: { label: "Rechazado", cls: "badge-danger" },
  WITH_ISSUES: { label: "Con problemas", cls: "badge-danger" },
  ARCHIVED: { label: "Archivada", cls: "badge-other" },
  DELETED: { label: "Eliminada", cls: "badge-other" },
};

export function StatusBadge({ status }) {
  if (!status) return null;
  const s = STATUS[status] || { label: status, cls: "badge-other" };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function roasClass(roas) {
  if (roas === null || roas === undefined) return "";
  return roas >= 1 ? "text-good" : "text-bad";
}

export const OBJECTIVES = {
  OUTCOME_SALES: "Ventas",
  OUTCOME_TRAFFIC: "Tráfico",
  OUTCOME_ENGAGEMENT: "Interacción",
  OUTCOME_AWARENESS: "Reconocimiento",
  OUTCOME_LEADS: "Clientes potenciales",
  OUTCOME_APP_PROMOTION: "App",
  CONVERSIONS: "Conversiones",
  LINK_CLICKS: "Tráfico",
  REACH: "Alcance",
  MESSAGES: "Mensajes",
};

const FILTERS = [
  { key: "ACTIVE", label: "Activas", test: (c) => c.status === "ACTIVE" },
  { key: "PAUSED", label: "Pausadas", test: (c) => c.status === "PAUSED" },
  { key: "ALL", label: "Todas", test: () => true },
];

const COLUMNS = [
  { key: "spend", label: "Inversión" },
  { key: "purchases", label: "Compras" },
  { key: "cpa", label: "CPA", asc: true },
  { key: "roas", label: "ROAS" },
  { key: "ctr", label: "CTR" },
  { key: "cpm", label: "CPM", asc: true },
];

/**
 * Tabla de campanas con metricas del periodo. Click en una fila entra a la
 * campana (sus anuncios).
 */
export default function Campaigns({ campaigns, totalSpend, currency, onSelect }) {
  // Arranca en "Activas" si hay alguna; si no, muestra todas.
  const [filter, setFilter] = useState(() => (campaigns.some((c) => c.status === "ACTIVE") ? "ACTIVE" : "ALL"));
  const [sort, setSort] = useState({ key: "spend", dir: -1 });

  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, campaigns.filter(f.test).length]));
  const rows = campaigns
    .filter(FILTERS.find((f) => f.key === filter).test)
    .sort((a, b) => {
      const va = a.m[sort.key];
      const vb = b.m[sort.key];
      // Los vacios (sin compras => sin CPA) siempre al final.
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return (va - vb) * sort.dir;
    });

  function toggleSort(col) {
    setSort((s) => (s.key === col.key ? { key: col.key, dir: -s.dir } : { key: col.key, dir: col.asc ? 1 : -1 }));
  }

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>Campañas</h2>
          <div className="section-sub">Click en una campaña para ver sus anuncios · click en una columna para ordenar</div>
        </div>
      </div>
      <div className="filter-row" style={{ flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <div
            key={f.key}
            className={"filter-pill" + (filter === f.key ? " active" : "")}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({counts[f.key]})
          </div>
        ))}
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaña</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="sortable" style={{ textAlign: "right" }} onClick={() => toggleSort(c)}>
                  {c.label}
                  {sort.key === c.key ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={"row-clickable" + (c.m.noResults ? " row-alert" : "")} onClick={() => onSelect(c.id)}>
                <td>
                  <div className="strong">{c.name}</div>
                  <div className="small muted" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                    <StatusBadge status={c.status} />
                    {OBJECTIVES[c.objective] || c.objective}
                    {c.dailyBudget ? ` · ${formatMoney(c.dailyBudget, currency)}/día` : ""}
                  </div>
                </td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {formatMoney(c.m.spend, currency)}
                  <div className="small muted">{totalSpend ? formatPercent(c.m.spend / totalSpend) : ""}</div>
                </td>
                <td className={"mono" + (c.m.noResults ? " text-bad" : "")} style={{ textAlign: "right" }}>
                  {c.m.purchases}
                </td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {c.m.cpa !== null ? formatMoney(c.m.cpa, currency) : "—"}
                </td>
                <td className={"mono " + roasClass(c.m.roas)} style={{ textAlign: "right" }}>
                  {c.m.roas !== null ? `${c.m.roas.toFixed(2)}x` : "—"}
                </td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {c.m.impressions ? formatPercent(c.m.ctr, 2) : "—"}
                </td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {c.m.cpm !== null ? formatMoney(c.m.cpm, currency) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-state">
                  No hay campañas con este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
