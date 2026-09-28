"use client";

import { useState } from "react";

// Solo aceptamos rutas internas para evitar redirecciones a otros sitios.
function safeNext(next) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default function LoginForm({ next }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      window.location.href = safeNext(next);
    } else {
      setError(data.error || "No se pudo ingresar");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="login-form">
      <label htmlFor="password" className="kpi-label">
        Contraseña
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        className="search-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
      />
      {error && <div className="alert-note">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading || !password}>
        {loading ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
