import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { errorResponse, httpError, requireAccount, requireMetaToken, requireRange } from "../../_shared/route-helpers";
import { getAdsWithDetails, getCampaignAccountId } from "@/lib/meta";
import { parseInsight } from "@/lib/metaMetrics";

// La mejor imagen disponible de la creatividad: imagen original, portada
// del video, imagen del link, y por ultimo la miniatura (baja resolucion).
function creativeImage(c) {
  if (!c) return null;
  const spec = c.object_story_spec || {};
  return c.image_url || spec.video_data?.image_url || spec.link_data?.picture || c.thumbnail_url || null;
}

function creativeText(c) {
  const spec = c?.object_story_spec || {};
  return {
    title: c?.title || spec.link_data?.name || spec.video_data?.title || null,
    body: c?.body || spec.link_data?.message || spec.video_data?.message || null,
    link: c?.object_url || c?.link_url || spec.link_data?.link || spec.video_data?.call_to_action?.value?.link || null,
    isVideo: Boolean(c?.video_id || spec.video_data),
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

    const { data, generatedAt } = await cached(["ads-v1", account.id, campaignId, range.since, range.until], async () => {
      if ((await getCampaignAccountId(token, campaignId)) !== account.id) {
        throw httpError("La campaña no pertenece a esta cuenta", 403, "forbidden");
      }
      const ads = await getAdsWithDetails(token, campaignId, range);
      return ads.map((ad) => ({
        id: ad.id,
        name: ad.name,
        adsetName: ad.adset?.name || null,
        status: ad.effective_status || ad.status,
        image: creativeImage(ad.creative),
        ...creativeText(ad.creative),
        metrics: parseInsight(ad.insights?.data?.[0] || {}),
      }));
    });
    return NextResponse.json({ ads: data, generatedAt });
  } catch (err) {
    return errorResponse(err);
  }
}
