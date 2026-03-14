import { analyzeMetaAccountAction } from "@/lib/actions/ads/analyze-meta-account";
import { getMetaAdAccountsAction } from "@/lib/actions/ads/get-meta-ad-accounts";
import { classifyCampaignAnalysisType } from "@/lib/agents/ads/context/campaign-type";
import { fetchInsightsByLevel } from "@/lib/agents/ads/context/shared";
import { getMetaEcommerceAnalysisContextAction } from "@/lib/agents/ads/context/ecommerce";
import { getMetaWhatsappAnalysisContextAction } from "@/lib/agents/ads/context/whatsapp";
import { getMetaFollowersAnalysisContextAction } from "@/lib/agents/ads/context/followers";
import { getMetaHistoricalRoasContextAction } from "@/lib/agents/ads/context/historical-roas";

type DeepContextParams = Record<string, unknown>;

function toLabel(account: unknown): string {
  const resolved = account as { accountName?: string; accountId?: string } | null;
  if (!resolved) return "Conta nao identificada";
  if (resolved.accountName && resolved.accountId) {
    return `${resolved.accountName} (${resolved.accountId})`;
  }
  return resolved.accountName || resolved.accountId || "Conta nao identificada";
}

function buildRiskLevel(alertCount: number, ctr: number, cpc: number): "low" | "medium" | "high" {
  if (alertCount >= 5 || ctr < 0.7 || cpc > 7) return "high";
  if (alertCount >= 2 || ctr < 1 || cpc > 4.5) return "medium";
  return "low";
}

export async function getMetaAccountDeepContextAction(params: DeepContextParams) {
  const analysis = await analyzeMetaAccountAction(params);
  if (!analysis.ok) {
    return analysis;
  }

  const analysisData = analysis.data as {
    account?: { resolvedAccount?: unknown };
    period?: { datePreset?: string; from?: string; to?: string };
    summary?: {
      spend?: number;
      ctr?: number;
      cpc?: number;
      cpm?: number;
      clicks?: number;
      impressions?: number;
    };
    alerts?: Array<{ message?: string }>;
    recommendations?: string[];
    worstCampaigns?: Array<{ name?: string }>;
    bestCampaigns?: Array<{ name?: string }>;
    sourceData?: {
      campaignsTotal?: number;
      adsTotal?: number;
      campaignInsightsRows?: number;
      adInsightsRows?: number;
    };
  };

  const summary = analysisData.summary || {};
  const alerts = analysisData.alerts || [];
  const recommendations = analysisData.recommendations || [];

  const relatedAccounts =
    typeof params.clientId === "string"
      ? await getMetaAdAccountsAction({ clientId: params.clientId })
      : null;

  const relatedRows =
    relatedAccounts?.ok && relatedAccounts.data && typeof relatedAccounts.data === "object"
      ? (((relatedAccounts.data as { rows?: unknown[] }).rows || []) as unknown[])
      : [];

  const campaignRows = await fetchInsightsByLevel("campaign", {
    accountId: typeof params.accountId === "string" ? params.accountId : undefined,
    accountName: typeof params.accountName === "string" ? params.accountName : undefined,
    clientName: typeof params.clientName === "string" ? params.clientName : undefined,
    clientId: typeof params.clientId === "string" ? params.clientId : undefined,
    datePreset: typeof params.datePreset === "string" ? params.datePreset : "last_7d",
    limit: typeof params.limit === "number" ? params.limit : 100,
    userMessage: typeof params.userMessage === "string" ? params.userMessage : undefined,
  });

  const typeDecision = campaignRows.ok
    ? classifyCampaignAnalysisType({
        userMessage: typeof params.userMessage === "string" ? params.userMessage : undefined,
        rows: campaignRows.rows,
      })
    : null;

  const specializedContext = typeDecision
    ? typeDecision.type === "ECOMMERCE"
      ? await getMetaEcommerceAnalysisContextAction(params)
      : typeDecision.type === "WHATSAPP"
        ? await getMetaWhatsappAnalysisContextAction(params)
        : await getMetaFollowersAnalysisContextAction(params)
    : null;

  const historicalRoas = await getMetaHistoricalRoasContextAction(params);

  return {
    ok: true,
    data: {
      account: {
        label: toLabel(analysisData.account?.resolvedAccount),
        resolvedAccount: analysisData.account?.resolvedAccount || null,
      },
      period: analysisData.period || { datePreset: "last_7d" },
      health: {
        riskLevel: buildRiskLevel(
          alerts.length,
          Number(summary.ctr || 0),
          Number(summary.cpc || 0),
        ),
        alertCount: alerts.length,
      },
      summary,
      recommendations,
      alerts: alerts.slice(0, 8),
      tacticalFocus: {
        topProblems: alerts.slice(0, 3).map((item) => item.message || "Alerta sem descricao"),
        quickWins: recommendations.slice(0, 3),
        weakCampaigns: (analysisData.worstCampaigns || []).slice(0, 3),
        strongCampaigns: (analysisData.bestCampaigns || []).slice(0, 3),
      },
      context: {
        sourceData: analysisData.sourceData || null,
        relatedAccountsCount: relatedRows.length,
        relatedAccounts: relatedRows.slice(0, 10),
      },
      campaignType: typeDecision
        ? {
            type: typeDecision.type,
            confidence: typeDecision.confidence,
            reason: typeDecision.reason,
            evidence: typeDecision.evidence,
          }
        : null,
      fullMetrics:
        specializedContext?.ok && specializedContext.data
          ? specializedContext.data
          : {
              warning: "Contexto especializado indisponivel nesta resposta.",
            },
      historicalRoas:
        historicalRoas?.ok && historicalRoas.data
          ? historicalRoas.data
          : {
              warning: "Historico de ROAS indisponivel no momento.",
            },
    },
  };
}
