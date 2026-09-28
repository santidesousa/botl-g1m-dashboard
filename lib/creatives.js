import { getAdImageUrls, getLargeThumbnails, getVideoCovers } from "@/lib/meta";

// Imagen y textos de las creatividades de Meta, en la mejor calidad posible.

// Hash de la imagen principal de la creatividad (imagen simple, primera del
// carrusel, creatividad dinamica o portada del video).
function creativeImageHash(c) {
  const spec = c?.object_story_spec || {};
  return (
    c?.image_hash ||
    spec.link_data?.image_hash ||
    spec.link_data?.child_attachments?.[0]?.image_hash ||
    spec.photo_data?.image_hash ||
    c?.asset_feed_spec?.images?.[0]?.hash ||
    spec.video_data?.image_hash ||
    null
  );
}

function creativeVideoId(c) {
  const spec = c?.object_story_spec || {};
  return c?.video_id || spec.video_data?.video_id || c?.asset_feed_spec?.videos?.[0]?.video_id || null;
}

/**
 * La mejor imagen disponible, de mayor a menor calidad:
 *   1. la original por hash (resolucion completa)
 *   2. image_url de la creatividad
 *   3. la miniatura generada por Meta a 1080px (sirve para videos y para
 *      publicaciones existentes de Instagram/Facebook, que no traen hash)
 *   4. la portada mas grande del video
 *   5. portadas/imagenes chicas que vienen en la creatividad y, por ultimo,
 *      thumbnail_url (64x64: se ve pixelada, solo si no hay otra cosa)
 * Devuelve { url, source }; source queda en la respuesta para diagnosticar.
 */
export function creativeImage(c, hd) {
  if (!c) return { url: null, source: null };
  const spec = c.object_story_spec || {};
  const candidates = [
    ["hash", hd.images[creativeImageHash(c)]],
    ["image_url", c.image_url],
    ["thumb_1080", hd.thumbs[c.id]],
    ["video_cover", hd.videos[creativeVideoId(c)]],
    ["video_image_url", spec.video_data?.image_url],
    ["link_picture", spec.link_data?.picture],
    ["thumb_64", c.thumbnail_url],
  ];
  const found = candidates.find(([, url]) => url);
  return found ? { url: found[1], source: found[0] } : { url: null, source: null };
}

// Cada fuente es opcional: si una falla, seguimos con las demas.
export async function loadHdImages(token, accountId, ads) {
  const creatives = ads.map((a) => a.creative).filter(Boolean);
  const safe = (p) => p.catch((err) => (console.error("Imagenes HD:", err.message), {}));
  const [images, videos, thumbs] = await Promise.all([
    safe(getAdImageUrls(token, accountId, creatives.map(creativeImageHash))),
    safe(getVideoCovers(token, creatives.map(creativeVideoId).filter(Boolean))),
    safe(getLargeThumbnails(token, creatives.map((c) => c.id))),
  ]);
  return { images, videos, thumbs };
}

export function creativeText(c) {
  const spec = c?.object_story_spec || {};
  return {
    title: c?.title || spec.link_data?.name || spec.video_data?.title || null,
    body: c?.body || spec.link_data?.message || spec.video_data?.message || null,
    link: c?.object_url || c?.link_url || spec.link_data?.link || spec.video_data?.call_to_action?.value?.link || null,
    isVideo: Boolean(creativeVideoId(c) || spec.video_data),
  };
}
