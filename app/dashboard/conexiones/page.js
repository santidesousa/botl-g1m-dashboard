"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchJson } from "../api";

// Avisar cuando falten menos de estos dias para que venza el token.
const WARN_DAYS = 10;

function daysUntil(iso) {
  return Math.ceil((new Date(iso) - Date.now()) / 86400000);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function Badge({ tone, children }) {
  const cls = { ok: "badge-active", warn: "badge-paused", bad: "badge-danger" }[tone];
  return <span className={`badge ${cls}`}>{children}</span>;
}

// Estado general del token de Meta: ok / por vencer / vencido o roto.
function metaState(meta) {
  if (!meta?.configured) return { tone: "bad", label: "Falta configurar" };
  const t = meta.token || {};
  const broken = meta.accounts?.some((a) => !a.ok);
  if (t.valid === false || broken) return { tone: "bad", label: "No funciona" };
  const days = t.expiresAt ? daysUntil(t.expiresAt) : null;
  if (days !== null && days <= WARN_DAYS) return { tone: "warn", label: `Vence en ${days} días` };
  return { tone: "ok", label: "Funcionando" };
}

function RenewedBanner({ renewed, expires }) {
  if (!renewed) return null;
  const until = expires ? formatDate(Number(expires)) : null;
  if (renewed === "error") {
    return (
      <div className="card kpi-warning">
        <strong>Token guardado en Vercel, pero no se pudo redeployar.</strong>
        <div className="small" style={{ marginTop: 4 }}>
          Entrá a Vercel → Deployments → ⋯ → Redeploy en el último deploy para que el panel lo empiece a usar.
        </div>
      </div>
    );
  }
  return (
    <div className="card kpi-success">
      <strong>Token renovado{until ? ` hasta el ${until}` : ""}.</strong>
      <div className="small" style={{ marginTop: 4 }}>
        Se guardó en Vercel y se está redeployando: en 1-2 minutos el panel usa el token nuevo. Hasta entonces esta
        página puede seguir mostrando el anterior.
      </div>
    </div>
  );
}

// Estado de la conexion con Meta y renovacion del token en un click.
export default function ConexionesPage() {
  return (
    <Suspense fallback={<div className="card skeleton" style={{ height: 200 }} />}>
      <Conexiones />
    </Suspense>
  );
}

function Conexiones() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJson("/api/admin/connections").then(setStatus).catch((e) => setError(e.message));
  }, []);

  const meta = status?.meta;
  const token = meta?.token;
  const state = status ? metaState(meta) : null;
  const days = token?.expiresAt ? daysUntil(token.expiresAt) : null;
  const auto = status?.vercel?.enabled;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Conexiones</h1>
          <p className="page-sub">Estado del token de Meta y renovación.</p>
        </div>
      </div>

      <RenewedBanner renewed={searchParams.get("renewed")} expires={searchParams.get("expires")} />

      {error && <div className="card alert-note">{error}</div>}
      {!status && !error && <div className="card skeleton" style={{ height: 200 }} />}

      {status && (
        <div className="card">
          <div className="section-head">
            <h2>Meta Ads</h2>
            <Badge tone={state.tone}>{state.label}</Badge>
          </div>

          <div className="drawer-block">
            {meta.accounts?.map((a) => (
              <div key={a.id}>
                {a.label}: <b>{a.ok ? a.name : "sin acceso"}</b> <span className="muted mono small">{a.id}</span>
                {!a.ok && <div className="alert-note">El token no puede leer esta cuenta: {a.error}</div>}
              </div>
            ))}
            {!meta.configured && <div className="muted small">Falta la variable META_ACCESS_TOKEN.</div>}

            {token && !token.error && (
              <div className={days !== null && days <= WARN_DAYS ? "alert-note" : "muted small"} style={{ marginTop: 6 }}>
                {token.neverExpires
                  ? "El token no vence (usuario del sistema)."
                  : token.expiresAt
                  ? `El token vence en ${days} días (${formatDate(token.expiresAt)}).`
                  : ""}
              </div>
            )}
            {token?.dataAccessExpiresAt && (
              <div className="muted small">
                Acceso a datos hasta el {formatDate(token.dataAccessExpiresAt)} (se extiende al renovar).
              </div>
            )}
            {token?.error && <div className="muted small">No se pudo leer el vencimiento: {token.error}</div>}
          </div>

          <a href="/api/auth/meta" className="btn btn-meta" style={{ marginTop: 12 }}>
            {meta.configured ? "Renovar token de Meta" : "Conectar Meta"}
          </a>
          <div className="muted small" style={{ marginTop: 8 }}>
            {auto
              ? "Te lleva a Facebook a confirmar y vuelve solo: el token nuevo se guarda en Vercel y se redeploya. Entrá con un usuario que vea las dos cuentas."
              : "Falta VERCEL_API_TOKEN: al volver de Facebook vas a tener que copiar el token a Vercel a mano (ver abajo)."}
          </div>
        </div>
      )}

      {status && (
        <div className="card">
          <h2>Configuración</h2>
          <div className="drawer-block">
            <div>App de Meta (META_APP_ID / META_APP_SECRET): {status.env.metaApp ? "✓ configurada" : "✗ falta"}</div>
            <div>
              Redirect (META_REDIRECT_URI): <span className="mono small">{status.env.redirectUri || "✗ falta"}</span>
            </div>
            <div>Contraseña del panel (DASHBOARD_PASSWORD): {status.env.dashboardPassword ? "✓ configurada" : "✗ falta"}</div>
            <div>
              Renovación automática (VERCEL_API_TOKEN):{" "}
              {auto ? `✓ activa · proyecto ${status.vercel.project} · equipo ${status.vercel.team}` : "✗ no configurada"}
            </div>
          </div>
          {!auto && (
            <ol className="steps" style={{ marginTop: 10 }}>
              <li>
                En <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer">vercel.com/account/tokens</a>{" "}
                creá un token con alcance al equipo del proyecto.
              </li>
              <li>
                Cargalo en Vercel → Settings → Environment Variables como <code>VERCEL_API_TOKEN</code> (Production). Si
                el equipo no es <code>tout2</code> o el proyecto no se llama <code>botl-g1m-dashboard</code>, agregá{" "}
                <code>VERCEL_TEAM</code> y <code>VERCEL_PROJECT</code>.
              </li>
              <li>Redeploy. Desde ahí, “Renovar token de Meta” guarda el token solo.</li>
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
