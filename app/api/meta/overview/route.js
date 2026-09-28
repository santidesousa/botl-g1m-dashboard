import { NextResponse } from "next/server";
import { cached } from "@/lib/cache";
import { errorResponse, requireAccount, requireMetaToken, requireRange } from "../../_shared/route-helpers";
import { getAccountInsights, getAdAccount, getCampaigns } from "@/lib/meta";
import { parseInsight } from "@/lib/metaMetrics";
import { previousRange } from "@/lib/dateRange";

// GET /api/meta/overview?account=botl&since=2026-09-01&until=2026-09-27
// Resumen de UNA cuenta: totales (periodo actual y anterior), series diaria y
// semanal, y campanas con sus metricas. Los anuncios de cada campana se piden
// aparte (/api/meta/ads) al entrar a la campana.
export async function GET(request) {
  try {
    const token = requireMetaToken();
    const account = requireAccount(request);
    const range = requireRange(request);
    const { data, generatedAt } = await cached(["overview-v1", account.id, range.since, range.until], () =>
      buildOverview(token, account.id, range)
    );
    return NextResponse.json({ ...data, generatedAt });
  } catch (err) {
    return errorResponse(err);
  }
}

async function buildOverview(accessToken, accountId, range) {
  const prev = previousRange(range);

  const [account, totals, previous, daily, weekly, campaigns, campaignRows] = await Promise.all([
    getAdAccount(accessToken, accountId),
    getAccountInsights(accessToken, accountId, range),
    getAccountInsights(accessToken, accountId, prev),
    getAccountInsights(accessToken, accountId, range, { time_increment: "1" }),
    // Agrupado por semana directamente en Meta (bloques de 7 dias desde `since`).
    getAccountInsights(accessToken, accountId, range, { time_increment: "7" }),
    getCampaigns(accessToken, accountId),
    getAccountInsights(accessToken, accountId, range, { level: "campaign", fields: "campaign_id" }),
  ]);

  const campaignMetrics = Object.fromEntries(campaignRows.map((r) => [r.campaign_id, parseInsight(r)]));

  return {
    account: {
      id: accountId,
      name: account.name,
      currency: account.currency,
      timezone: account.timezone_name,
    },
    range,
    previousRange: prev,
    totals: parseInsight(totals[0] || {}),
    previous: previous[0] ? parseInsight(previous[0]) : null,
    daily: daily.map((r) => ({ day: r.date_start, ...parseInsight(r) })),
    weekly: weekly.map((r) => ({ day: r.date_start, until: r.date_stop, ...parseInsight(r) })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.effective_status || c.status,
      objective: c.objective,
      dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
      metrics: campaignMetrics[c.id] || null,
    })),
  };
}
