import { classifyCampaignAnalysisType } from "@/lib/agents/ads/context/campaign-type";
import { aggregateRows, fetchInsightsByLevel, topRowsBy } from "@/lib/agents/ads/context/shared";
import type { AdsContextInput } from "@/lib/agents/ads/context/types";

export async function getMetaEcommerceAnalysisContextAction(params: Record<string, unknown>) {
  const input: AdsContextInput = {
    accountId: typeof params.accountId === "string" ? params.accountId : undefined,
    accountName: typeof params.accountName === "string" ? params.accountName : undefined,
    clientId: typeof params.clientId === "string" ? params.clientId : undefined,
    datePreset: typeof params.datePreset === "string" ? params.datePreset : "last_7d",
    days: typeof params.days === "number" ? params.days : undefined,
    limit: typeof params.limit === "number" ? params.limit : 100,
    userMessage: typeof params.userMessage === "string" ? params.userMessage : undefined,
  };

  const [campaignData, adsetData, adData] = await Promise.all([
    fetchInsightsByLevel("campaign", input),
    fetchInsightsByLevel("adset", input),
    fetchInsightsByLevel("ad", input),
  ]);

  if (!campaignData.ok) return campaignData;
  if (!adsetData.ok) return adsetData;
  if (!adData.ok) return adData;

  const campaignTotals = aggregateRows(campaignData.rows);
  const adsetTotals = aggregateRows(adsetData.rows);
  const adTotals = aggregateRows(adData.rows);
  const classification = classifyCampaignAnalysisType({
    userMessage: input.userMessage,
    rows: campaignData.rows,
  });

  return {
    ok: true,
    data: {
      campaignType: classification.type,
      campaignTypeConfidence: classification.confidence,
      campaignTypeReason: classification.reason,
      evidence: classification.evidence,
      account: {
        accountId: input.accountId || null,
        accountName: input.accountName || null,
        clientId: input.clientId || null,
      },
      period: {
        datePreset: input.datePreset,
        days: input.days || null,
      },
      totals: campaignTotals,
      funnel: {
        clicks: campaignTotals.clicks,
        landingPageViews: campaignTotals.actions.landingPageViews,
        addToCart: campaignTotals.actions.addToCart,
        initiateCheckout: campaignTotals.actions.initiateCheckout,
        purchases: campaignTotals.actions.purchases,
        conversionValue: campaignTotals.actions.conversionValue,
        lpvRate: campaignTotals.derived.lpvRate,
        addToCartRate: campaignTotals.derived.addToCartRate,
        checkoutRate: campaignTotals.derived.checkoutRate,
        purchaseCost: campaignTotals.derived.purchaseCost,
        averageOrderValue: campaignTotals.derived.averageOrderValue,
        roas: campaignTotals.derived.roas,
      },
      levelSummaries: {
        campaign: campaignTotals,
        adset: adsetTotals,
        ad: adTotals,
      },
      leaders: {
        topSpendCampaigns: topRowsBy(campaignData.rows, "spend", 6),
        topPurchaseAds: topRowsBy(adData.rows, "purchases", 6),
      },
      warnings: [
        classification.confidence < 0.65
          ? "Classificacao de tipo de campanha com baixa confianca. Revise objetivo/naming."
          : null,
        campaignData.rows.length === 0
          ? "Nenhum insight retornado no periodo selecionado para ecommerce."
          : null,
      ].filter((value): value is string => Boolean(value)),
    },
  };
}
