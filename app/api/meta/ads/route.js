import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { errorResponse, httpError, requireAccount, requireMetaToken, requireRange } from "../../_shared/route-helpers";
import {
  getAdImageUrls,
  getAdsWithDetails,
  getCampaignAccountId,
  getLargeThumbnails,
  getVideoCovers,
} from "@/lib/meta";
import { parseInsight } from "@/lib/metaMetrics";

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
function creativeImage(c, hd) {
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
async function loadHdImages(token, accountId, ads) {
  const creatives = ads.map((a) => a.creative).filter(Boolean);
  const safe = (p) => p.catch((err) => (console.error("Imagenes HD:", err.message), {}));
  const [images, videos, thumbs] = await Promise.all([
    safe(getAdImageUrls(token, accountId, creatives.map(creativeImageHash))),
    safe(getVideoCovers(token, creatives.map(creativeVideoId).filter(Boolean))),
    safe(getLargeThumbnails(token, creatives.map((c) => c.id))),
  ]);
  return { images, videos, thumbs };
}

function creativeText(c) {
  const spec = c?.object_story_spec || {};
  return {
    title: c?.title || spec.link_data?.name || spec.video_data?.title || null,
    body: c?.body || spec.link_data?.message || spec.video_data?.message || null,
    link: c?.object_url || c?.link_url || spec.link_data?.link || spec.video_data?.call_to_action?.value?.link || null,
    isVideo: Boolean(creativeVideoId(c) || spec.video_data),
  };
}

// GET /api/meta/ads?account=botl&campaignId=120...&since=2026-09-01&until=2026-09-27
// Anuncios de una campana, con creatividad y metricas del periodo. La campana
// tiene que pertenecer a la cuenta de la pestana.
export async function GET(request) {
  try {
    const token = requireMetaToken();
    const account = requireAccount(request);
    const range = requireRange(request);
    const campaignId = new URL(request.url).searchParams.get("campaignId");
    if (!/^\d+$/.test(campaignId || "")) throw httpError("Falta el parametro campaignId", 400, "bad_request");

    const { data, generatedAt } = await cached(["ads-v2", account.id, campaignId, range.since, range.until], async () => {
      if ((await getCampaignAccountId(token, campaignId)) !== account.id) {
        throw httpError("La campaña no pertenece a esta cuenta", 403, "forbidden");
      }
      const ads = await getAdsWithDetails(token, campaignId, range);
      const hd = await loadHdImages(token, account.id, ads);
      return ads.map((ad) => ({
        id: ad.id,
        name: ad.name,
        adsetName: ad.adset?.name || null,
        status: ad.effective_status || ad.status,
        image: creativeImage(ad.creative, hd),
        ...creativeText(ad.creative),
        metrics: parseInsight(ad.insights?.data?.[0] || {}),
      }));
    });
    return NextResponse.json({ ads: data, generatedAt });
  } catch (err) {
    return errorResponse(err);
  }
}
