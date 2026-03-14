import {
  buildPerformanceAnalysis,
  defaultMetaPerformanceThresholds,
  type MetaMetricRow,
  type MetaPerformanceThresholds,
} from "@/lib/analysis/meta/performance";
import { getMetaAccountOverviewAction } from "./get-meta-account-overview";
import { getMetaAdsAction } from "./get-meta-ads";
import { getMetaCampaignsAction } from "./get-meta-campaigns";
import { getMetaInsightsAction } from "./get-meta-insights";

type ActionParams = {
  accountId?: string;
  accountName?: string;
  clientName?: string;
  clientId?: string;
  datePreset?: string;
  limit?: number;
  thresholds?: Partial<MetaPerformanceThresholds>;
};

function toParams(params: Record<string, unknown>): ActionParams {
  return {
    accountId: typeof params.accountId === "string" ? params.accountId : undefined,
    accountName: typeof params.accountName === "string" ? params.accountName : undefined,
    clientName: typeof params.clientName === "string" ? params.clientName : undefined,
    clientId: typeof params.clientId === "string" ? params.clientId : undefined,
    datePreset: typeof params.datePreset === "string" ? params.datePreset : "last_7d",
    limit: typeof params.limit === "number" ? params.limit : 50,
    thresholds:
      params.thresholds && typeof params.thresholds === "object"
        ? (params.thresholds as Partial<MetaPerformanceThresholds>)
        : undefined,
  };
}

function getError(result: { error?: string; errorCategory?: string; missingEnv?: string[] }) {
  return {
    ok: false as const,
    error: result.error || "Falha ao executar analise de performance.",
    errorCategory: result.errorCategory,
    missingEnv: result.missingEnv,
  };
}

export async function analyzeMetaAccountAction(rawParams: Record<string, unknown>) {
  const params = toParams(rawParams);
  const mergedThresholds: MetaPerformanceThresholds = {
    ...defaultMetaPerformanceThresholds,
    ...(params.thresholds || {}),
  };

  const baseParams = {
    accountId: params.accountId,
    accountName: params.accountName,
    clientName: params.clientName,
    clientId: params.clientId,
    datePreset: params.datePreset,
    limit: params.limit,
  };

  const [overviewResult, campaignsResult, adsResult, campaignInsightsResult, adInsightsResult] =
    await Promise.all([
      getMetaAccountOverviewAction(baseParams),
      getMetaCampaignsAction(baseParams),
      getMetaAdsAction(baseParams),
      getMetaInsightsAction({ ...baseParams, level: "campaign" }),
      getMetaInsightsAction({ ...baseParams, level: "ad" }),
    ]);

  if (!campaignInsightsResult.ok) return getError(campaignInsightsResult);
  if (!adInsightsResult.ok) return getError(adInsightsResult);
  if (!overviewResult.ok) return getError(overviewResult);
  if (!campaignsResult.ok) return getError(campaignsResult);
  if (!adsResult.ok) return getError(adsResult);

  const campaignRows =
    ((campaignInsightsResult.data as { rows?: MetaMetricRow[] })?.rows || []) as MetaMetricRow[];
  const adRows = ((adInsightsResult.data as { rows?: MetaMetricRow[] })?.rows || []) as MetaMetricRow[];

  const analysis = buildPerformanceAnalysis(campaignRows, adRows, mergedThresholds);
  const resolvedAccount =
    (campaignInsightsResult.data as { resolvedAccount?: unknown })?.resolvedAccount ||
    (overviewResult.data as { resolvedAccount?: unknown })?.resolvedAccount ||
    null;

  const overview = (overviewResult.data as { overview?: unknown })?.overview;
  const campaigns = (campaignsResult.data as { rows?: unknown[] })?.rows || [];
  const ads = (adsResult.data as { rows?: unknown[] })?.rows || [];

  return {
    ok: true,
    data: {
      account: {
        resolvedAccount,
        overview,
      },
      period: {
        datePreset: params.datePreset || "last_7d",
        from: analysis.period?.from,
        to: analysis.period?.to,
      },
      summary: analysis.summary,
      alerts: analysis.alerts,
      worstCampaigns: analysis.worstCampaigns,
      bestCampaigns: analysis.bestCampaigns,
      worstAds: analysis.worstAds,
      topAds: analysis.topAds,
      recommendations: analysis.recommendations,
      thresholds: mergedThresholds,
      sourceData: {
        campaignsTotal: campaigns.length,
        adsTotal: ads.length,
        campaignInsightsRows: campaignRows.length,
        adInsightsRows: adRows.length,
      },
      hasEnoughData: analysis.hasEnoughData,
    },
  };
}
