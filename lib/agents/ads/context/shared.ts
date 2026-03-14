import { getMetaInsightsAction } from "@/lib/actions/ads/get-meta-insights";
import { calculateDerivedAdsMetrics } from "@/lib/agents/ads/context/derived-metrics";
import type {
  AdsContextInput,
  AggregatedBaseMetrics,
  MetaInsightRichRow,
  MetaInsightsLevel,
} from "@/lib/agents/ads/context/types";
import type { MetaNormalizedActions } from "@/lib/integrations/meta/actions-parser";

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyActions(): MetaNormalizedActions {
  return {
    landingPageViews: 0,
    addToCart: 0,
    initiateCheckout: 0,
    purchases: 0,
    conversionValue: 0,
    messagingConversations: 0,
    profileVisits: 0,
    followers: 0,
    leads: 0,
    linkClicks: 0,
    purchaseRoas: 0,
  };
}

export async function fetchInsightsByLevel(
  level: MetaInsightsLevel,
  input: AdsContextInput,
): Promise<{ ok: true; rows: MetaInsightRichRow[] } | { ok: false; error: string; details?: unknown }> {
  const response = await getMetaInsightsAction({
    accountId: input.accountId,
    accountName: input.accountName,
    clientName: input.clientName,
    clientId: input.clientId,
    datePreset: input.datePreset,
    days: input.days,
    level,
    limit: input.limit ?? 100,
  });

  if (!response.ok) {
    return {
      ok: false,
      error: response.error || `Falha ao buscar insights no nivel ${level}.`,
      details: response,
    };
  }

  const rows = ((response.data as { rows?: unknown[] })?.rows || []) as MetaInsightRichRow[];
  return {
    ok: true,
    rows,
  };
}

export function aggregateRows(rows: MetaInsightRichRow[]): AggregatedBaseMetrics {
  const totals = rows.reduce(
    (acc, row) => {
      acc.spend += toNumber(row.spend);
      acc.impressions += toNumber(row.impressions);
      acc.reach += toNumber(row.reach);
      acc.clicks += toNumber(row.clicks);
      acc.actions.landingPageViews += toNumber(row.actions?.landingPageViews);
      acc.actions.addToCart += toNumber(row.actions?.addToCart);
      acc.actions.initiateCheckout += toNumber(row.actions?.initiateCheckout);
      acc.actions.purchases += toNumber(row.actions?.purchases);
      acc.actions.conversionValue += toNumber(row.actions?.conversionValue);
      acc.actions.messagingConversations += toNumber(row.actions?.messagingConversations);
      acc.actions.profileVisits += toNumber(row.actions?.profileVisits);
      acc.actions.followers += toNumber(row.actions?.followers);
      acc.actions.leads += toNumber(row.actions?.leads);
      acc.actions.linkClicks += toNumber(row.actions?.linkClicks);
      acc.actions.purchaseRoas += toNumber(row.actions?.purchaseRoas);
      return acc;
    },
    {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      actions: emptyActions(),
    },
  );

  const ctr = totals.impressions > 0 ? (totals.clicks * 100) / totals.impressions : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend * 1000) / totals.impressions : 0;

  const derived = calculateDerivedAdsMetrics(
    {
      spend: totals.spend,
      clicks: totals.clicks,
    },
    totals.actions,
  );

  return {
    spend: Number(totals.spend.toFixed(2)),
    impressions: Math.round(totals.impressions),
    reach: Math.round(totals.reach),
    clicks: Math.round(totals.clicks),
    ctr: Number(ctr.toFixed(4)),
    cpc: Number(cpc.toFixed(4)),
    cpm: Number(cpm.toFixed(4)),
    actions: totals.actions,
    derived,
  };
}

export function topRowsBy(rows: MetaInsightRichRow[], metric: "spend" | "clicks" | "purchases", limit = 5) {
  const getMetric = (row: MetaInsightRichRow) => {
    if (metric === "purchases") {
      return toNumber(row.actions?.purchases);
    }
    return toNumber(row[metric]);
  };

  return [...rows]
    .sort((a, b) => getMetric(b) - getMetric(a))
    .slice(0, limit)
    .map((row) => ({
      campaignName: row.campaign_name || "sem_nome",
      adsetName: row.adset_name || null,
      adName: row.ad_name || null,
      objective: row.objective || null,
      optimizationGoal: row.optimization_goal || null,
      spend: row.spend,
      clicks: row.clicks,
      purchases: row.actions?.purchases || 0,
      messagingConversations: row.actions?.messagingConversations || 0,
      followers: row.actions?.followers || 0,
    }));
}
