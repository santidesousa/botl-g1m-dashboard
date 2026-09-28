"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// YYYY-MM-DD en hora local (toISOString usa UTC, y en Argentina despues de
// las 21hs devolveria el dia siguiente).
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function presetRange(key) {
  const end = new Date();
  const start = new Date();
  if (key === "today") {
    // start = end = hoy
  } else if (key === "7d") {
    start.setDate(end.getDate() - 6);
  } else if (key === "30d") {
    start.setDate(end.getDate() - 29);
  } else if (key === "month") {
    start.setDate(1);
  }
  return { since: isoDate(start), until: isoDate(end) };
}

const PRESETS = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "Últimos 7 días" },
  { key: "30d", label: "Últimos 30 días" },
  { key: "month", label: "Este mes" },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Estado del rango de fechas sincronizado con la URL (?range=30d o
 * ?since=...&until=...), para poder compartir un link con un periodo.
 * Devuelve null en el primer render (hasta leer la URL), asi no se pide
 * dos veces la misma data.
 */
export function useDateRange(defaultKey = "30d") {
  const [range, setRangeState] = useState(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const key = p.get("range");
    let since = p.get("since");
    let until = p.get("until");
    if (key && PRESETS.some((x) => x.key === key)) {
      setRangeState({ key, ...presetRange(key) });
    } else if (DATE_RE.test(since || "") && DATE_RE.test(until || "")) {
      if (since > until) [since, until] = [until, since];
      setRangeState({ key: "custom", since, until });
    } else {
      setRangeState({ key: defaultKey, ...presetRange(defaultKey) });
    }
  }, [defaultKey]);

  const setRange = useCallback((next) => {
    setRangeState(next);
    const p = new URLSearchParams(window.location.search);
    ["range", "since", "until"].forEach((k) => p.delete(k));
    if (next.key === "custom") {
      p.set("since", next.since);
      p.set("until", next.until);
    } else {
      p.set("range", next.key);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
  }, []);

  return [range, setRange];
}

/**
 * Selector de rango: atajos rapidos + calendario donde se elige el rango con
 * dos clicks (primer dia y ultimo dia).
 * `value` es { key, since, until }; key === "custom" cuando se eligio a mano.
 */
export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="filter-row date-range">
      {PRESETS.map((p) => (
        <div
          key={p.key}
          className={"filter-pill" + (value.key === p.key ? " active" : "")}
          onClick={() => onChange({ key: p.key, ...presetRange(p.key) })}
        >
          {p.label}
        </div>
      ))}
      <div className="range-anchor">
        <button
          type="button"
          className={"range-trigger" + (value.key === "custom" ? " active" : "") + (open ? " open" : "")}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <CalendarIcon />
          {formatRange(value.since, value.until)}
          <span className="range-caret">▾</span>
        </button>
        {open && (
          <RangeCalendar
            value={value}
            onClose={() => setOpen(false)}
            onSelect={(since, until) => {
              onChange({ key: "custom", since, until });
              setOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendario de rango
// ---------------------------------------------------------------------------

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function parts(day) {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
}

/** "1 sep – 17 sep 2026" (o "1 – 17 sep 2026" si es el mismo mes) */
function formatRange(since, until) {
  const a = parts(since);
  const b = parts(until);
  if (since === until) return `${a.d} ${MONTHS[a.m - 1]} ${a.y}`;
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${a.d} ${MONTHS[a.m - 1]} ${a.y} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
}

function monthKey(y, m) {
  return y * 12 + (m - 1);
}

function fromMonthKey(k) {
  return { y: Math.floor(k / 12), m: (k % 12) + 1 };
}

/** Celdas del mes (semana de lunes a domingo); null = hueco antes del dia 1 */
function monthCells(y, m) {
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return cells;
}

/**
 * Primer click: dia de inicio. Segundo click: dia de fin (si es anterior al
 * inicio, se invierten) y se aplica. Mientras tanto, pasar el mouse muestra
 * como quedaria el rango. Los dias futuros no se pueden elegir.
 */
function RangeCalendar({ value, onSelect, onClose }) {
  const today = isoDate(new Date());
  const t = parts(today);
  const u = parts(value.until);
  // Se muestran dos meses: el anterior y el del "hasta" (nunca despues de hoy).
  const initialRight = Math.min(monthKey(u.y, u.m), monthKey(t.y, t.m));
  const [rightMonth, setRightMonth] = useState(initialRight);
  const [start, setStart] = useState(null);
  const [hover, setHover] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    function onDown(e) {
      if (ref.current && !ref.current.parentElement.contains(e.target)) onClose();
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  // Rango a pintar: el que se esta eligiendo, o el actual.
  let from = value.since;
  let to = value.until;
  if (start) {
    const other = hover || start;
    [from, to] = start <= other ? [start, other] : [other, start];
  }

  function pick(day) {
    if (day > today) return;
    if (!start) {
      setStart(day);
      return;
    }
    const [a, b] = start <= day ? [start, day] : [day, start];
    onSelect(a, b);
  }

  const canGoNext = rightMonth < monthKey(t.y, t.m);
  const months = [rightMonth - 1, rightMonth].map(fromMonthKey);

  return (
    <div className="range-popover" ref={ref} role="dialog" aria-label="Elegir rango de fechas">
      <div className="cal-header">
        <button type="button" className="cal-nav" onClick={() => setRightMonth((k) => k - 1)} aria-label="Mes anterior">
          ‹
        </button>
        <span className="cal-hint">
          {start ? "Ahora elegí el último día" : "Elegí el primer día"}
        </span>
        <button
          type="button"
          className="cal-nav"
          onClick={() => canGoNext && setRightMonth((k) => k + 1)}
          disabled={!canGoNext}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>
      <div className="cal-months" onMouseLeave={() => setHover(null)}>
        {months.map(({ y, m }, i) => (
          <div key={`${y}-${m}`} className={"cal-month" + (i === 0 ? " cal-month-prev" : "")}>
            <div className="cal-title">
              {MONTHS_LONG[m - 1]} {y}
            </div>
            <div className="cal-grid">
              {WEEKDAYS.map((w, j) => (
                <div key={j} className="cal-dow">
                  {w}
                </div>
              ))}
              {monthCells(y, m).map((day, j) => {
                if (!day) return <div key={`e${j}`} />;
                const disabled = day > today;
                const isStart = day === from;
                const isEnd = day === to;
                const inRange = day >= from && day <= to;
                const cls =
                  "cal-day" +
                  (inRange ? " in-range" : "") +
                  (isStart ? " range-start" : "") +
                  (isEnd ? " range-end" : "") +
                  (day === today ? " today" : "") +
                  (disabled ? " disabled" : "");
                return (
                  <div
                    key={day}
                    className={cls}
                    onMouseEnter={() => start && !disabled && setHover(day)}
                    onClick={() => pick(day)}
                  >
                    <span>{parts(day).d}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
