import { NextResponse } from "next/server";
import { getCampaignInsights, getCampaigns } from "@/lib/meta";
import { parseInsight } from "@/lib/metaMetrics";
import { errorResponse, requireAccount, requireMetaToken } from "../../_shared/route-helpers";

// GET /api/meta/campaigns?account=botl[&campaignId=120...&since=...&until=...]
// Sin campaignId: campanas de la cuenta. Con campaignId: sus metricas.
export async function GET(request) {
  try {
    const token = requireMetaToken();
    const account = requireAccount(request);
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const campaigns = await getCampaigns(token, account.id);

    if (!campaignId) return NextResponse.json({ campaigns });

    if (!campaigns.some((c) => c.id === campaignId)) {
      return NextResponse.json({ error: "La campaña no pertenece a esta cuenta" }, { status: 403 });
    }
    const since = searchParams.get("since");
    const until = searchParams.get("until");
    const insights = await getCampaignInsights(token, campaignId, since && until ? { since, until } : undefined);
    return NextResponse.json({ campaignId, metrics: parseInsight(insights.data?.[0] || {}) });
  } catch (err) {
    return errorResponse(err);
  }
}
