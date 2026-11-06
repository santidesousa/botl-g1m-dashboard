// Guarda variables de entorno en Vercel y redeploya, usando la API de Vercel.
// Asi renovar el token de Meta es un click: el callback de OAuth escribe
// META_ACCESS_TOKEN directo en el proyecto, sin copiar/pegar.
//
// Variables (Vercel -> Settings -> Environment Variables):
// - VERCEL_API_TOKEN: token de vercel.com/account/tokens con acceso al equipo.
// - VERCEL_PROJECT: id o nombre del proyecto (por defecto botl-g1m-dashboard).
// - VERCEL_TEAM: id (team_...) o slug del equipo (por defecto tout2).
// - VERCEL_DEPLOY_HOOK_URL (opcional): si esta, se redeploya con el hook en
//   vez de la API.

const API = "https://api.vercel.com";

function config() {
  const team = process.env.VERCEL_TEAM || "tout2";
  return {
    token: process.env.VERCEL_API_TOKEN,
    project: process.env.VERCEL_PROJECT || process.env.VERCEL_PROJECT_ID || "botl-g1m-dashboard",
    teamParam: team.startsWith("team_") ? ["teamId", team] : ["slug", team],
    deployHook: process.env.VERCEL_DEPLOY_HOOK_URL,
  };
}

/** true si el panel puede escribir en Vercel por si solo */
export function vercelAutomationEnabled() {
  return Boolean(process.env.VERCEL_API_TOKEN);
}

/** Datos de configuracion para mostrar en Conexiones (sin secretos) */
export function vercelSettings() {
  const c = config();
  return { enabled: Boolean(c.token), project: c.project, team: c.teamParam[1], deployHook: Boolean(c.deployHook) };
}

async function vercelFetch(path, { method = "GET", body, query = {} } = {}) {
  const c = config();
  const url = new URL(`${API}${path}`);
  url.searchParams.set(...c.teamParam);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method,
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Vercel ${method} ${path}: ${data?.error?.message || res.status}`);
  }
  return data;
}

async function getProject() {
  return vercelFetch(`/v9/projects/${encodeURIComponent(config().project)}`);
}

/**
 * Pone `value` en la variable `key` en todos los entornos donde ya exista.
 * Si no existe, la crea para Production y Preview.
 */
export async function setEnvVar(key, value) {
  const project = await getProject();
  const { envs = [] } = await vercelFetch(`/v9/projects/${project.id}/env`);
  const existing = envs.filter((e) => e.key === key);

  if (existing.length) {
    for (const e of existing) {
      await vercelFetch(`/v9/projects/${project.id}/env/${e.id}`, { method: "PATCH", body: { value } });
    }
  } else {
    await vercelFetch(`/v10/projects/${project.id}/env`, {
      method: "POST",
      body: { key, value, type: "encrypted", target: ["production", "preview"] },
    });
  }
  return project;
}

/**
 * Redeploya produccion para que tome las variables nuevas. Devuelve la URL
 * del deploy en el panel de Vercel (si se sabe).
 */
export async function redeployProduction(project) {
  const c = config();
  if (c.deployHook) {
    const res = await fetch(c.deployHook, { method: "POST", cache: "no-store" });
    if (!res.ok) throw new Error(`Deploy hook de Vercel: ${res.status}`);
    return null;
  }

  project = project || (await getProject());
  const { deployments = [] } = await vercelFetch("/v6/deployments", {
    query: { projectId: project.id, target: "production", state: "READY", limit: "1" },
  });
  if (!deployments.length) throw new Error("No hay un deploy de produccion para redeployar");

  const deployment = await vercelFetch("/v13/deployments", {
    method: "POST",
    body: { name: project.name, deploymentId: deployments[0].uid, target: "production" },
  });
  return deployment.inspectorUrl || null;
}
