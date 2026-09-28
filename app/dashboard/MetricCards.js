"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { delta, formatPercent } from "./format";

/**
 * Definicion de una metrica (ver metricDefs.js):
 *   { label, color, better: "up" | "down" | null, format(v), axis(v), kind?: "bar", rightAxis? }
 * `better`: "up" si es mejor que suba, "down" si es mejor que baje (costos,
 * cancelaciones), null si es neutra. Colores en hex: los graficos SVG no
 * resuelven var(--...).
 */

/**
 * "good" | "neutral" segun la direccion del cambio y la metrica. Las cuentas
 * recien arrancan: los empeoramientos se muestran en gris, nunca en rojo.
 */
export function changeTone(def, change) {
  if (!def.better || change === 0) return "neutral";
  const improved = def.better === "up" ? change > 0 : change < 0;
  return improved ? "good" : "neutral";
}

/**
 * Tarjetas de KPI: valor del periodo, variacion vs el periodo anterior
 * (verde si mejora, rojo si empeora), valor anterior y tendencia en un mini
 * grafico.
 *
 * - defs: { [key]: definicion }, keys: cuales mostrar y en que orden
 * - current / previous: objetos con esas claves
 * - series: serie diaria con esas claves, para los sparklines
 */
export default function MetricCards({ defs, keys, current, previous, series }) {
  return (
    <div className="metric-cards">
      {keys.map((key) => {
        const def = defs[key];
        const value = current[key];
        const prev = previous?.[key];
        const hasValue = value !== null && value !== undefined;
        const change = hasValue && prev ? delta(value, prev) : null;
        const tone = change !== null ? changeTone(def, change) : null;
        return (
          <div key={key} className="metric-card">
            <div className="metric-card-top">
              <span className="metric-card-label">{def.short || def.label}</span>
              {change !== null && isFinite(change) && (
                <span className={`delta-chip delta-${tone}`}>
                  {change >= 0 ? "↑" : "↓"} {change >= 0 ? "+" : "−"}
                  {formatPercent(Math.abs(change), 1)}
                </span>
              )}
            </div>
            <div className="metric-card-value" title={hasValue ? def.format(value) : undefined}>
              {hasValue ? cardValue(def, value) : "—"}
            </div>
            <div className="metric-card-prev">
              {prev !== null && prev !== undefined ? `anterior: ${cardValue(def, prev)}` : "sin datos del período anterior"}
            </div>
            <Sparkline data={series} dataKey={key} color={def.color} />
          </div>
        );
      })}
    </div>
  );
}

// En la tarjeta, montos de 10 millones o mas se abrevian ("$ 33,5 M") para
// que entren; el valor completo queda en el tooltip.
function cardValue(def, value) {
  return def.axis && def.format !== def.axis && Math.abs(value) >= 1e7 ? def.axis(value) : def.format(value);
}

function Sparkline({ data, dataKey, color }) {
  const id = `spark-${dataKey}`;
  return (
    <div className="sparkline">
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, "auto"]} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#${id})`}
            connectNulls
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
