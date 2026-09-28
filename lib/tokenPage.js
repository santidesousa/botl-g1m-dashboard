// Pagina HTML que muestra el callback de OAuth: en vez de guardar el token
// en una cookie, se lo muestra para pegarlo a mano en las Environment
// Variables de Vercel (META_ACCESS_TOKEN). Se hace una sola vez.

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Colores y tipografia de app/globals.css (la respuesta no carga ese CSS).
const STYLES = `
  :root { --bg:#f6f6f4; --surface:#fff; --ink:#16191c; --muted:#6b7280; --border:#e3e3df;
          --accent:#2f5d50; --accent-soft:#e7efec; --danger:#b3261e; --danger-soft:#fbeceb; --warning-soft:#fbf1de; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         -webkit-font-smoothing:antialiased; padding:2rem 1rem; }
  main { max-width:720px; margin:0 auto; }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:1.4rem; margin-bottom:0.9rem; }
  .mark { width:40px; height:40px; border-radius:10px; background:var(--accent); color:#fff; display:flex; align-items:center;
          justify-content:center; font-weight:700; margin-bottom:0.8rem; }
  h1 { font-size:1.35rem; margin:0 0 0.3rem; letter-spacing:-0.01em; }
  p { line-height:1.55; font-size:0.9rem; }
  .muted { color:var(--muted); }
  label { display:block; font-size:0.78rem; font-weight:600; color:var(--muted); margin:1rem 0 0.35rem; }
  code { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:0.85rem; background:var(--accent-soft); color:var(--accent);
         padding:0.1rem 0.35rem; border-radius:5px; }
  .row { display:flex; gap:0.5rem; }
  textarea { flex:1; font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:0.8rem; border:1px solid var(--border);
             border-radius:8px; padding:0.6rem 0.7rem; resize:none; background:#fafaf8; color:var(--ink); word-break:break-all; }
  button { border:none; background:var(--ink); color:#fff; font:inherit; font-size:0.85rem; font-weight:600; border-radius:8px;
           padding:0 1rem; cursor:pointer; white-space:nowrap; }
  ol { font-size:0.9rem; line-height:1.7; padding-left:1.2rem; margin:0.3rem 0 0; }
  .note { background:var(--warning-soft); border-radius:8px; padding:0.8rem 0.9rem; font-size:0.85rem; }
  .error { background:var(--danger-soft); color:var(--danger); border-radius:8px; padding:0.9rem; font-size:0.9rem; }
  a { color:var(--accent); font-weight:600; }
`;

const SCRIPT = `
  document.querySelectorAll("button[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var el = document.getElementById(btn.getAttribute("data-copy"));
      el.select();
      (navigator.clipboard ? navigator.clipboard.writeText(el.value) : Promise.resolve(document.execCommand("copy")))
        .then(function () { btn.textContent = "¡Copiado!"; setTimeout(function () { btn.textContent = "Copiar"; }, 1500); });
    });
  });
`;

function htmlResponse(body, status = 200) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Token · BOTL · G1M</title><style>${STYLES}</style></head>
<body><main>${body}</main><script>${SCRIPT}</script></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // El token no debe quedar en caches ni filtrarse por Referer.
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

/**
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.intro
 * @param {Array<{name: string, label: string, value: string}>} p.fields
 * @param {string} [p.note] - aviso extra (HTML confiable, generado por nosotros)
 */
export function tokenPage({ title, intro, fields, note }) {
  const fieldsHtml = fields
    .map(
      (f, i) => `
      <label for="f${i}">${escapeHtml(f.label)} → variable <code>${escapeHtml(f.name)}</code></label>
      <div class="row">
        <textarea id="f${i}" rows="${Math.min(5, Math.max(1, Math.ceil(String(f.value).length / 28)))}" readonly>${escapeHtml(f.value)}</textarea>
        <button type="button" data-copy="f${i}">Copiar</button>
      </div>`
    )
    .join("");

  return htmlResponse(`
    <div class="card">
      <div class="mark">BG</div>
      <h1>${escapeHtml(title)}</h1>
      <p class="muted">${escapeHtml(intro)}</p>
      ${fieldsHtml}
    </div>
    ${note ? `<div class="card note">${note}</div>` : ""}
    <div class="card">
      <strong>Cómo cargarlo en Vercel</strong>
      <ol>
        <li>Vercel → proyecto <b>botl-g1m-dashboard</b> → <b>Settings → Environment Variables</b>.</li>
        <li>Por cada valor: <b>Add Environment Variable</b>, pegá el nombre exacto (el de <code>código</code>) y el valor. Entorno: <b>Production</b>.</li>
        <li>Si la variable ya existe, editala (⋯ → Edit) y reemplazá el valor.</li>
        <li><b>Deployments → ⋯ → Redeploy</b> en el último deploy. Sin esto, los cambios no se aplican.</li>
      </ol>
      <p class="muted">Este valor da acceso a los datos de la cuenta: no lo compartas ni lo pegues en otro lado.</p>
      <p><a href="/dashboard">Ir al panel</a></p>
    </div>
  `);
}

export function tokenErrorPage(title, message) {
  return htmlResponse(
    `<div class="card"><div class="mark">BG</div><h1>${escapeHtml(title)}</h1>
     <div class="error">${escapeHtml(message)}</div>
     <p><a href="/dashboard">Ir al panel</a></p></div>`,
    400
  );
}
