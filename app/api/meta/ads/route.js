import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { errorResponse, httpError, requireAccount, requireMetaToken, requireRange } from "../../_shared/route-helpers";
import {
  CREATIVE_FIELDS,
  getAccountInsights,
  getActiveAds,
  getAdsWithDetails,
  getCampaignAccountId,
  getObjectsByIds,
} from "@/lib/meta";
import { creativeImage, creativeText, loadHdImages } from "@/lib/creatives";
import { parseInsight } from "@/lib/metaMetrics";

// GET /api/meta/ads?account=botl&since=2026-09-01&until=2026-09-27[&campaignId=120...]
// Sin campaignId: todos los anuncios de la cuenta (los que tuvieron actividad
// en el periodo + los que estan activos hoy). Con campaignId: solo los de esa
// campana, que tiene que pertenecer a la cuenta de la pestana.
export async function GET(request) {
  try {
    const token = requireMetaToken();
    const account = requireAccount(request);
    const range = requireRange(request);
    const campaignId = new URL(request.url).searchParams.get("campaignId");
    if (campaignId && !/^\d+$/.test(campaignId)) throw httpError("campaignId invalido", 400, "bad_request");

    const { data, generatedAt } = await cached(
      ["ads-v3", account.id, campaignId || "all", range.since, range.until],
      () => (campaignId ? campaignAds(token, account, campaignId, range) : accountAds(token, account, range))
    );
    return NextResponse.json({ ads: data, generatedAt });
  } catch (err) {
    return errorResponse(err);
  }
}

async function campaignAds(token, account, campaignId, range) {
  if ((await getCampaignAccountId(token, campaignId)) !== account.id) {
    throw httpError("La campaña no pertenece a esta cuenta", 403, "forbidden");
  }
  const ads = await getAdsWithDetails(token, campaignId, range);
  const hd = await loadHdImages(token, account.id, ads);
  return ads.map((ad) => ({
    id: ad.id,
    name: ad.name,
    adsetName: ad.adset?.name || null,
    campaignId,
    status: ad.effective_status || ad.status,
    image: creativeImage(ad.creative, hd),
    ...creativeText(ad.creative),
    metrics: parseInsight(ad.insights?.data?.[0] || {}),
  }));
}

async function accountAds(token, account, range) {
  const [rows, active] = await Promise.all([
    getAccountInsights(token, account.id, range, {
      level: "ad",
      fields: "ad_id,ad_name,adset_name,campaign_id,campaign_name",
    }),
    // Si falla, seguimos sin el listado de activos antes que romper el panel.
    getActiveAds(token, account.id).catch((err) => {
      console.error("No se pudieron traer los anuncios activos", err.message);
      return [];
    }),
  ]);
  const activeById = Object.fromEntries(active.map((a) => [a.id, a]));

  // Creatividad y estado de los anuncios con actividad que no estan activos.
  const others = await getObjectsByIds(
    token,
    rows.map((r) => r.ad_id).filter((id) => !activeById[id]),
    { fields: `effective_status,${CREATIVE_FIELDS}` }
  ).catch((err) => {
    console.error("No se pudieron traer las creatividades", err.message);
    return {};
  });

  const objFor = (id) => activeById[id] || others[id] || {};
  const hd = await loadHdImages(token, account.id, [...active, ...Object.values(others)]);

  return [
    ...rows.map((r) => {
      const obj = objFor(r.ad_id);
      return {
        id: r.ad_id,
        name: r.ad_name,
        adsetName: r.adset_name,
        campaignId: r.campaign_id,
        status: obj.effective_status || null,
        image: creativeImage(obj.creative, hd),
        ...creativeText(obj.creative),
        metrics: parseInsight(r),
      };
    }),
    // Activos sin actividad en el periodo: con metricas en cero.
    ...active
      .filter((a) => !rows.some((r) => r.ad_id === a.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        adsetName: a.adset?.name || null,
        campaignId: a.campaign?.id || null,
        status: a.effective_status,
        image: creativeImage(a.creative, hd),
        ...creativeText(a.creative),
        metrics: parseInsight({}),
      })),
  ];
}
