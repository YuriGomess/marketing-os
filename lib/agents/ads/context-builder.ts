import { analyzeMetaAccountAction } from "@/lib/actions/ads/analyze-meta-account";
import { getMetaAdAccountsAction } from "@/lib/actions/ads/get-meta-ad-accounts";

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
    },
  };
}
