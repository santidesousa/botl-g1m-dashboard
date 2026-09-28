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
 * La mejor imagen disponible, de mayor a menor calidad: la original por hash,
 * image_url, la portada grande del video, la miniatura pedida a 1080px y, por
 * ultimo, thumbnail_url (64x64: se ve pixelada, solo si no hay otra cosa).
 */
export function creativeImage(c, hd) {
  if (!c) return null;
  const spec = c.object_story_spec || {};
  return (
    hd.images[creativeImageHash(c)] ||
    c.image_url ||
    hd.videos[creativeVideoId(c)] ||
    spec.video_data?.image_url ||
    hd.thumbs[c.id] ||
    spec.link_data?.picture ||
    c.thumbnail_url ||
    null
  );
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
