import { revalidateTag, unstable_cache } from "next/cache";

// Cache de respuestas de Meta en el servidor (Vercel Data Cache). Evita
// consultar la API en cada carga de pagina y respetar sus limites.
// "Actualizar" en el panel invalida todo (ver /api/refresh).
export const CACHE_SECONDS = 600;
const TAG = "meta";

/**
 * Ejecuta fn() cacheando su resultado bajo keyParts.
 * Devuelve { data, generatedAt }. Si fn lanza error no se cachea nada.
 */
export function cached(keyParts, fn) {
  return unstable_cache(
    async () => ({ data: await fn(), generatedAt: new Date().toISOString() }),
    [TAG, ...keyParts.map(String)],
    { revalidate: CACHE_SECONDS, tags: [TAG] }
  )();
}

export function invalidateAll() {
  revalidateTag(TAG);
}
