import { analyzeMetaAccountAction } from "./analyze-meta-account";

type SummaryInput = Record<string, unknown>;

function accountLabel(resolved: unknown): string {
  const account = resolved as { accountName?: string; accountId?: string } | undefined;
  if (!account) return "Conta nao identificada";
  if (account.accountName && account.accountId) {
    return `${account.accountName} (${account.accountId})`;
  }
  return account.accountName || account.accountId || "Conta nao identificada";
}

export async function generateMetaPerformanceSummaryAction(params: SummaryInput) {
  const analysisResult = await analyzeMetaAccountAction(params);
  if (!analysisResult.ok) {
    return analysisResult;
  }

  const data = analysisResult.data as {
    account: { resolvedAccount?: unknown };
    period: { datePreset?: string; from?: string; to?: string };
    summary: {
      spend: number;
      impressions: number;
      clicks: number;
      ctr: number;
      cpc: number;
      cpm: number;
    };
    alerts: Array<{ message: string }>;
    worstCampaigns: Array<{ name: string }>;
    worstAds: Array<{ name: string }>;
    recommendations: string[];
  };

  const label = accountLabel(data.account?.resolvedAccount);
  const periodLabel = data.period?.from && data.period?.to
    ? `${data.period.from} a ${data.period.to}`
    : data.period?.datePreset || "last_7d";

  const highlights = [
    `Conta: ${label}`,
    `Periodo: ${periodLabel}`,
    `Spend: ${data.summary.spend.toFixed(2)} | Impressoes: ${data.summary.impressions} | Cliques: ${data.summary.clicks}`,
    `CTR: ${data.summary.ctr}% | CPC: ${data.summary.cpc} | CPM: ${data.summary.cpm}`,
    `Alertas: ${data.alerts.length}`,
    `Piores campanhas: ${data.worstCampaigns.slice(0, 3).map((x) => x.name).join(" | ") || "nenhuma"}`,
    `Piores anuncios: ${data.worstAds.slice(0, 3).map((x) => x.name).join(" | ") || "nenhum"}`,
  ];

  return {
    ok: true,
    data: {
      ...data,
      executiveSummary: highlights.join("\n"),
      recommendations: data.recommendations,
    },
  };
}

export async function listMetaPerformanceAlertsAction(params: SummaryInput) {
  const analysisResult = await analyzeMetaAccountAction(params);
  if (!analysisResult.ok) {
    return analysisResult;
  }

  const data = analysisResult.data as {
    account: { resolvedAccount?: unknown };
    period: { datePreset?: string; from?: string; to?: string };
    alerts: unknown[];
    worstCampaigns: unknown[];
    worstAds: unknown[];
  };

  return {
    ok: true,
    data: {
      account: data.account,
      period: data.period,
      alerts: data.alerts,
      worstCampaigns: data.worstCampaigns,
      worstAds: data.worstAds,
    },
  };
}
