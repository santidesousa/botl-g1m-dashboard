"use client";

import { useEffect, useState } from "react";
import DateRangePicker from "./DateRangePicker";
import { formatDayLabel, timeAgo } from "./format";

/**
 * Encabezado comun: titulo, rango de fechas, cuando se actualizaron los
 * datos (con boton para forzar datos frescos) y descarga en PDF.
 */
export default function PageHeader({ title, subtitle, range, onRangeChange, generatedAt, onRefresh, actions }) {
  const [, tick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Re-render cada 30s para que "hace X min" se mantenga al dia.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  async function refresh() {
    setRefreshing(true);
    await fetch("/api/refresh", { method: "POST" }).catch(() => {});
    await onRefresh?.();
    setRefreshing(false);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
          {range && (
            <p className="print-only page-sub">
              Período: {formatDayLabel(range.since)} – {formatDayLabel(range.until)}
            </p>
          )}
        </div>
        <div className="page-actions no-print">
          {generatedAt && (
            <span className="freshness">
              Datos {timeAgo(generatedAt)}
              {onRefresh && (
                <button className="link-btn" onClick={refresh} disabled={refreshing}>
                  {refreshing ? "Actualizando…" : "Actualizar"}
                </button>
              )}
            </span>
          )}
          {actions}
          <button className="btn-ghost" onClick={() => window.print()} title="Guardar como PDF desde el diálogo de impresión">
            Descargar PDF
          </button>
        </div>
      </div>
      {range && (
        <div className="no-print">
          <DateRangePicker value={range} onChange={onRangeChange} />
        </div>
      )}
    </>
  );
}

/** El mas viejo de varios generatedAt (el dato menos fresco en pantalla) */
export function oldest(...dates) {
  const valid = dates.filter(Boolean).sort();
  return valid[0] || null;
}
