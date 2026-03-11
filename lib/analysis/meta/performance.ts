export type MetaMetricRow = {
  account_name?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  spend?: string | number;
  impressions?: string | number;
  clicks?: string | number;
  cpc?: string | number;
  cpm?: string | number;
  ctr?: string | number;
  date_start?: string;
  date_stop?: string;
};

export type MetaPerformanceThresholds = {
  ctrLowThreshold: number;
  cpcHighThreshold: number;
  spendNoResultThreshold: number;
  minSpendForEvaluation: number;
  minImpressionsForEvaluation: number;
};

export const defaultMetaPerformanceThresholds: MetaPerformanceThresholds = {
  ctrLowThreshold: 1.0,
  cpcHighThreshold: 3.0,
  spendNoResultThreshold: 80,
  minSpendForEvaluation: 30,
  minImpressionsForEvaluation: 1000,
};

export type MetricsSummary = {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
};

export type PerformanceIssue = {
  name: string;
  reason: "low_ctr" | "high_cpc" | "no_result";
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
};

export type PerformanceAlert = {
  code:
    | "insufficient_data"
    | "low_ctr_detected"
    | "high_cpc_detected"
    | "no_result_detected"
    | "healthy_top_performers";
  severity: "info" | "warning" | "critical";
  message: string;
};

export type GroupPerformance = {
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
};

export type PerformanceAnalysisResult = {
  summary: MetricsSummary;
  alerts: PerformanceAlert[];
  worstCampaigns: PerformanceIssue[];
  bestCampaigns: GroupPerformance[];
  worstAds: PerformanceIssue[];
  topAds: GroupPerformance[];
  recommendations: string[];
  period?: { from?: string; to?: string };
  hasEnoughData: boolean;
};

function toNumber(value: string | number | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDivision(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function computeSummary(rows: MetaMetricRow[]): MetricsSummary {
  const totals = rows.reduce<{ spend: number; impressions: number; clicks: number }>(
    (acc, row) => {
      acc.spend += toNumber(row.spend);
      acc.impressions += toNumber(row.impressions);
      acc.clicks += toNumber(row.clicks);
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0 },
  );

  const ctr = safeDivision(totals.clicks * 100, totals.impressions);
  const cpc = safeDivision(totals.spend, totals.clicks);
  const cpm = safeDivision(totals.spend * 1000, totals.impressions);

  return {
    spend: round(totals.spend),
    impressions: Math.round(totals.impressions),
    clicks: Math.round(totals.clicks),
    ctr: round(ctr),
    cpc: round(cpc),
    cpm: round(cpm),
  };
}

type GroupBy = "campaign_name" | "ad_name";

function aggregateBy(rows: MetaMetricRow[], key: GroupBy): GroupPerformance[] {
  const bucket = new Map<string, { spend: number; impressions: number; clicks: number }>();

  for (const row of rows) {
    const name = (row[key] || "sem_nome").toString().trim() || "sem_nome";
    const spend = toNumber(row.spend);
    const impressions = toNumber(row.impressions);
    const clicks = toNumber(row.clicks);

    const current = bucket.get(name) || { spend: 0, impressions: 0, clicks: 0 };
    current.spend += spend;
    current.impressions += impressions;
    current.clicks += clicks;
    bucket.set(name, current);
  }

  return Array.from(bucket.entries()).map(([name, metrics]) => {
    const ctr = safeDivision(metrics.clicks * 100, metrics.impressions);
    const cpc = safeDivision(metrics.spend, metrics.clicks);
    const cpm = safeDivision(metrics.spend * 1000, metrics.impressions);
    return {
      name,
      spend: round(metrics.spend),
      impressions: Math.round(metrics.impressions),
      clicks: Math.round(metrics.clicks),
      ctr: round(ctr),
      cpc: round(cpc),
      cpm: round(cpm),
    };
  });
}

export function sortCampaignsBySpend(rows: MetaMetricRow[]): GroupPerformance[] {
  return aggregateBy(rows, "campaign_name").sort((a, b) => b.spend - a.spend);
}

function getIssues(
  groups: GroupPerformance[],
  thresholds: MetaPerformanceThresholds,
): PerformanceIssue[] {
  const issues: PerformanceIssue[] = [];

  for (const group of groups) {
    const enoughSpend = group.spend >= thresholds.minSpendForEvaluation;
    const enoughImpressions = group.impressions >= thresholds.minImpressionsForEvaluation;

    if (enoughSpend && enoughImpressions && group.ctr > 0 && group.ctr < thresholds.ctrLowThreshold) {
      issues.push({ ...group, reason: "low_ctr" });
    }

    if (enoughSpend && group.clicks > 0 && group.cpc > thresholds.cpcHighThreshold) {
      issues.push({ ...group, reason: "high_cpc" });
    }

    if (group.spend >= thresholds.spendNoResultThreshold && group.clicks === 0) {
      issues.push({ ...group, reason: "no_result" });
    }
  }

  return issues.sort((a, b) => b.spend - a.spend);
}

export function identifyLowCtrCampaigns(
  rows: MetaMetricRow[],
  thresholds: MetaPerformanceThresholds = defaultMetaPerformanceThresholds,
): PerformanceIssue[] {
  return getIssues(sortCampaignsBySpend(rows), thresholds).filter((issue) => issue.reason === "low_ctr");
}

export function identifyHighCpcCampaigns(
  rows: MetaMetricRow[],
  thresholds: MetaPerformanceThresholds = defaultMetaPerformanceThresholds,
): PerformanceIssue[] {
  return getIssues(sortCampaignsBySpend(rows), thresholds).filter((issue) => issue.reason === "high_cpc");
}

export function identifyNoResultCampaigns(
  rows: MetaMetricRow[],
  thresholds: MetaPerformanceThresholds = defaultMetaPerformanceThresholds,
): PerformanceIssue[] {
  return getIssues(sortCampaignsBySpend(rows), thresholds).filter((issue) => issue.reason === "no_result");
}

export function identifyWorstAds(
  adRows: MetaMetricRow[],
  thresholds: MetaPerformanceThresholds = defaultMetaPerformanceThresholds,
): PerformanceIssue[] {
  return getIssues(aggregateBy(adRows, "ad_name"), thresholds);
}

export function identifyTopPerformers(
  rows: MetaMetricRow[],
  by: GroupBy,
  thresholds: MetaPerformanceThresholds = defaultMetaPerformanceThresholds,
): GroupPerformance[] {
  return aggregateBy(rows, by)
    .filter(
      (item) =>
        item.spend >= thresholds.minSpendForEvaluation &&
        item.impressions >= thresholds.minImpressionsForEvaluation &&
        item.ctr >= thresholds.ctrLowThreshold,
    )
    .sort((a, b) => {
      if (b.ctr !== a.ctr) return b.ctr - a.ctr;
      return a.cpc - b.cpc;
    });
}

export function buildPerformanceAnalysis(
  campaignRows: MetaMetricRow[],
  adRows: MetaMetricRow[],
  thresholds: MetaPerformanceThresholds = defaultMetaPerformanceThresholds,
): PerformanceAnalysisResult {
  const summary = computeSummary(campaignRows);
  const campaignGroups = sortCampaignsBySpend(campaignRows);
  const campaignIssues = getIssues(campaignGroups, thresholds);
  const worstAds = identifyWorstAds(adRows, thresholds);
  const bestCampaigns = identifyTopPerformers(campaignRows, "campaign_name", thresholds);
  const topAds = identifyTopPerformers(adRows, "ad_name", thresholds);

  const hasEnoughData = campaignRows.length > 0;
  const alerts: PerformanceAlert[] = [];

  if (!hasEnoughData) {
    alerts.push({
      code: "insufficient_data",
      severity: "warning",
      message: "Dados insuficientes para analise de performance no periodo selecionado.",
    });
  }

  if (campaignIssues.some((item) => item.reason === "low_ctr")) {
    alerts.push({
      code: "low_ctr_detected",
      severity: "warning",
      message: "Foram encontradas campanhas com CTR abaixo do limite configurado.",
    });
  }

  if (campaignIssues.some((item) => item.reason === "high_cpc")) {
    alerts.push({
      code: "high_cpc_detected",
      severity: "warning",
      message: "Foram encontradas campanhas com CPC acima do limite configurado.",
    });
  }

  if (
    campaignIssues.some((item) => item.reason === "no_result") ||
    worstAds.some((item) => item.reason === "no_result")
  ) {
    alerts.push({
      code: "no_result_detected",
      severity: "critical",
      message: "Existem campanhas/anuncios com gasto relevante sem cliques no periodo.",
    });
  }

  if (bestCampaigns.length > 0 || topAds.length > 0) {
    alerts.push({
      code: "healthy_top_performers",
      severity: "info",
      message: "Top performers identificados para possivel realocacao de verba.",
    });
  }

  const recommendations: string[] = [];
  if (campaignIssues.some((item) => item.reason === "low_ctr")) {
    recommendations.push("Revisar criativos e segmentacao das campanhas com CTR baixo.");
  }
  if (campaignIssues.some((item) => item.reason === "high_cpc")) {
    recommendations.push("Ajustar lances/orcamento das campanhas com CPC alto.");
  }
  if (campaignIssues.some((item) => item.reason === "no_result")) {
    recommendations.push("Pausar ou reduzir verba de campanhas sem cliques e testar novo anuncio.");
  }
  if (bestCampaigns.length > 0) {
    recommendations.push("Considerar aumento gradual de verba nas campanhas com melhor CTR/CPC.");
  }

  const period = campaignRows[0]
    ? {
        from: campaignRows[0].date_start,
        to: campaignRows[0].date_stop,
      }
    : undefined;

  return {
    summary,
    alerts,
    worstCampaigns: campaignIssues.slice(0, 5),
    bestCampaigns: bestCampaigns.slice(0, 5),
    worstAds: worstAds.slice(0, 5),
    topAds: topAds.slice(0, 5),
    recommendations,
    period,
    hasEnoughData,
  };
}
