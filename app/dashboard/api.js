// fetch + JSON para las paginas del panel. Si la sesion vencio, manda al
// login; si la API devuelve { error }, lanza un Error con su `code`.
export async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
  if (res.status === 401 && data.code === "unauthorized") {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    throw new Error("Sesión vencida");
  }
  if (data?.error) {
    const err = new Error(data.error);
    err.code = data.code;
    throw err;
  }
  return data;
}
