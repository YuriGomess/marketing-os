import type { AgentContext, AgentExecutionResult, AgentRouteResult } from "@/lib/ai/types";
import { adsAgentPrompt } from "./prompt";
import { adsTools } from "./tools";
import { getMetaAccountOverviewAction } from "@/lib/actions/ads/get-meta-account-overview";
import { getMetaCampaignsAction } from "@/lib/actions/ads/get-meta-campaigns";
import { getMetaAdsAction } from "@/lib/actions/ads/get-meta-ads";
import { getMetaInsightsAction } from "@/lib/actions/ads/get-meta-insights";
import { syncMetaAdAccountsAction } from "@/lib/actions/ads/sync-meta-ad-accounts";
import { getMetaAdAccountsAction } from "@/lib/actions/ads/get-meta-ad-accounts";
import {
  generateMetaPerformanceSummaryAction,
  listMetaPerformanceAlertsAction,
} from "@/lib/actions/ads/generate-meta-summary";
import { analyzeMetaAccountAction } from "@/lib/actions/ads/analyze-meta-account";

type ActionResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  errorCategory?: string;
  missingEnv?: string[];
  foundEnv?: string[];
  details?: unknown;
};

type ResolvedAccount = {
  accountId: string;
  accountName?: string;
  source:
    | "explicit_account_id"
    | "account_name"
    | "client_binding"
    | "default_db"
    | "env_fallback";
};

type AnalysisPayload = {
  account?: { resolvedAccount?: ResolvedAccount };
  period?: { datePreset?: string; from?: string; to?: string };
  summary?: {
    spend?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    cpc?: number;
    cpm?: number;
  };
  alerts?: Array<{ message?: string }>;
  worstCampaigns?: Array<{ name?: string }>;
  bestCampaigns?: Array<{ name?: string }>;
  worstAds?: Array<{ name?: string }>;
  recommendations?: string[];
  executiveSummary?: string;
};

function getResolvedAccount(data: unknown): ResolvedAccount | undefined {
  return (data as { resolvedAccount?: ResolvedAccount })?.resolvedAccount;
}

function getAccountLabel(data: unknown): string {
  const resolved = getResolvedAccount(data);
  if (!resolved) {
    return "conta nao identificada";
  }

  const name = resolved.accountName?.trim();
  if (name) {
    return `${name} (${resolved.accountId})`;
  }

  return resolved.accountId;
}

function summarizeRows(data: unknown, label: string): string {
  const rows = (data as { rows?: Record<string, unknown>[] })?.rows;
  const count = Array.isArray(rows) ? rows.length : 0;
  const sample = Array.isArray(rows)
    ? rows
        .slice(0, 3)
        .map((row) => {
          const value = row?.name ?? row?.campaign_name ?? row?.ad_name;
          return typeof value === "string" ? value : undefined;
        })
        .filter((value): value is string => Boolean(value))
    : [];

  const account = getAccountLabel(data);
  const names = sample.length > 0 ? ` Principais: ${sample.join(" | ")}.` : "";
  return `${label}: ${count} registro(s) encontrados para ${account}.${names}`;
}

function summarizeInsights(data: unknown): string {
  const payload = data as { rows?: Record<string, unknown>[] };
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const account = getAccountLabel(data);

  const toNumber = (value: unknown): number => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const totals = rows.reduce<{ spend: number; impressions: number; clicks: number }>(
    (acc, row) => {
      const spend = toNumber(row.spend);
      const impressions = toNumber(row.impressions);
      const clicks = toNumber(row.clicks);
      return {
        spend: acc.spend + spend,
        impressions: acc.impressions + impressions,
        clicks: acc.clicks + clicks,
      };
    },
    { spend: 0, impressions: 0, clicks: 0 },
  );

  const first = rows[0];
  const periodStart = typeof first?.date_start === "string" ? first.date_start : undefined;
  const periodEnd = typeof first?.date_stop === "string" ? first.date_stop : undefined;
  const period = periodStart && periodEnd ? ` Periodo: ${periodStart} a ${periodEnd}.` : "";

  return `Insights: ${rows.length} registro(s) para ${account}.${period} Spend total: ${totals.spend.toFixed(
    2,
  )}. Impressoes: ${totals.impressions}. Cliques: ${totals.clicks}.`;
}

function normalizeForIntent(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildConfigMissingMessage(result: ActionResult): string {
  const missing = result.missingEnv?.join(", ") || "META_ACCESS_TOKEN, META_AD_ACCOUNT_ID";
  const found = result.foundEnv?.join(", ") || "nenhuma";
  return `Configuracao Meta incompleta no backend. Variaveis faltando: ${missing}. Variaveis encontradas: ${found}.`;
}

function extractAccountName(message: string): string | undefined {
  const match = message.match(/conta\s+(?:da|do|de)?\s*([^?,.!]+)/i);
  if (!match?.[1]) {
    return undefined;
  }

  return match[1].trim();
}

function formatAnalysisSummary(data: unknown): string {
  const payload = data as AnalysisPayload;
  const resolved = payload.account?.resolvedAccount;
  const account = resolved
    ? `${resolved.accountName || resolved.accountId} (${resolved.source})`
    : "conta nao identificada";
  const period = payload.period?.from && payload.period?.to
    ? `${payload.period.from} a ${payload.period.to}`
    : payload.period?.datePreset || "last_7d";

  const worstCampaigns = (payload.worstCampaigns || [])
    .slice(0, 3)
    .map((item) => item.name)
    .filter(Boolean)
    .join(" | ");
  const worstAds = (payload.worstAds || [])
    .slice(0, 3)
    .map((item) => item.name)
    .filter(Boolean)
    .join(" | ");
  const alerts = (payload.alerts || [])
    .slice(0, 3)
    .map((item) => item.message)
    .filter(Boolean)
    .join(" | ");

  return [
    `Conta usada: ${account}.`,
    `Periodo: ${period}.`,
    `Resumo: spend ${payload.summary?.spend ?? 0}, impressoes ${payload.summary?.impressions ?? 0}, cliques ${payload.summary?.clicks ?? 0}, CTR ${payload.summary?.ctr ?? 0}%, CPC ${payload.summary?.cpc ?? 0}.`,
    `Campanhas com maior atencao: ${worstCampaigns || "nenhuma"}.`,
    `Anuncios com maior atencao: ${worstAds || "nenhum"}.`,
    `Alertas principais: ${alerts || "nenhum"}.`,
  ].join(" ");
}

function formatWorstItems(data: unknown, kind: "campaign" | "ad"): string {
  const payload = data as AnalysisPayload;
  const resolved = payload.account?.resolvedAccount;
  const account = resolved?.accountName || resolved?.accountId || "conta nao identificada";
  const items = (kind === "campaign" ? payload.worstCampaigns : payload.worstAds) || [];
  const top = items
    .slice(0, 3)
    .map((item) => item.name)
    .filter(Boolean)
    .join(" | ");

  return `${kind === "campaign" ? "Campanhas" : "Anuncios"} com maior atencao em ${account}: ${top || "nenhum item critico no periodo"}.`;
}

function formatAlerts(data: unknown): string {
  const payload = data as AnalysisPayload;
  const resolved = payload.account?.resolvedAccount;
  const account = resolved?.accountName || resolved?.accountId || "conta nao identificada";
  const alerts = (payload.alerts || [])
    .slice(0, 5)
    .map((item) => item.message)
    .filter(Boolean)
    .join(" | ");

  return `Alertas da conta ${account}: ${alerts || "nenhum alerta relevante"}.`;
}

export async function runAdsAgent(
  context: AgentContext,
  route: AgentRouteResult,
): Promise<AgentExecutionResult> {
  const accountName = extractAccountName(context.message);
  const normalizedMessage = normalizeForIntent(context.message);
  const mentionsAccountsList =
    normalizedMessage.includes("minhas contas") ||
    normalizedMessage.includes("contas do meta") ||
    normalizedMessage.includes("quais contas");
  const mentionsAccountsSync =
    normalizedMessage.includes("sincronizar contas") ||
    normalizedMessage.includes("importar contas");
  const mentionsCampaigns =
    normalizedMessage.includes("campanha") || normalizedMessage.includes("campanhas");
  const mentionsAds =
    normalizedMessage.includes("anunc") ||
    normalizedMessage.includes("ncio") ||
    normalizedMessage.includes("anuncio") ||
    normalizedMessage.includes("anuncios") ||
    normalizedMessage.includes("criativ") ||
    normalizedMessage.includes("criativo") ||
    normalizedMessage.includes("criativos");
  const mentionsInsights =
    normalizedMessage.includes("analise") ||
    normalizedMessage.includes("analisar") ||
    normalizedMessage.includes("relat") ||
    normalizedMessage.includes("relatorio") ||
    normalizedMessage.includes("desempenho") ||
    normalizedMessage.includes("metrica") ||
    normalizedMessage.includes("metricas") ||
    normalizedMessage.includes("resultado") ||
    normalizedMessage.includes("resultados");
  const mentionsOverview =
    normalizedMessage.includes("conta") ||
    normalizedMessage.includes("overview") ||
    normalizedMessage.includes("visao") ||
    normalizedMessage.includes("visao geral");

  const mentionsAnalysis =
    normalizedMessage.includes("analise a conta") ||
    normalizedMessage.includes("analisar conta") ||
    normalizedMessage.includes("diagnostico") ||
    normalizedMessage.includes("performance da conta");
  const mentionsSummary =
    normalizedMessage.includes("resumo da conta") ||
    normalizedMessage.includes("resumo da performance") ||
    normalizedMessage.includes("resumo");
  const mentionsAlerts =
    normalizedMessage.includes("alerta") ||
    normalizedMessage.includes("alertas") ||
    normalizedMessage.includes("atencao");
  const mentionsWorstCampaigns =
    mentionsCampaigns &&
    (normalizedMessage.includes("piores") ||
      normalizedMessage.includes("pior") ||
      normalizedMessage.includes("maior atencao"));
  const mentionsWorstAds =
    mentionsAds &&
    (normalizedMessage.includes("piores") ||
      normalizedMessage.includes("pior") ||
      normalizedMessage.includes("maior atencao"));

  let intent:
    | "accounts_list"
    | "accounts_sync"
    | "overview"
    | "campaigns"
    | "ads"
    | "insights"
    | "performance_analysis"
    | "performance_summary"
    | "performance_alerts"
    | "worst_campaigns"
    | "worst_ads" = "insights";
  if (mentionsAccountsSync) {
    intent = "accounts_sync";
  } else if (mentionsAccountsList) {
    intent = "accounts_list";
  } else if (mentionsWorstCampaigns) {
    intent = "worst_campaigns";
  } else if (mentionsWorstAds) {
    intent = "worst_ads";
  } else if (mentionsAlerts) {
    intent = "performance_alerts";
  } else if (mentionsAnalysis) {
    intent = "performance_analysis";
  } else if (mentionsSummary) {
    intent = "performance_summary";
  } else if (mentionsCampaigns) {
    intent = "campaigns";
  } else if (mentionsAds) {
    intent = "ads";
  } else if (mentionsInsights) {
    intent = "insights";
  } else if (mentionsOverview) {
    intent = "overview";
  }

  const baseParams = {
    accountId:
      typeof context.metadata?.accountId === "string"
        ? context.metadata.accountId
        : undefined,
    accountName,
    clientId: context.clientId,
    limit: 25,
    datePreset: "last_7d",
  };

  let result: ActionResult;
  let summary: string;

  if (intent === "accounts_sync") {
    result = await syncMetaAdAccountsAction(baseParams);
    const synced = (result.data as { synced?: number; total?: number } | undefined)?.synced || 0;
    const total = (result.data as { synced?: number; total?: number } | undefined)?.total || 0;
    summary = `Sincronizacao concluida. ${synced} conta(s) atualizada(s). Total salvo: ${total}.`;
  } else if (intent === "accounts_list") {
    result = await getMetaAdAccountsAction(baseParams);
    const total = (result.data as { total?: number } | undefined)?.total || 0;
    summary = `Contas Meta sincronizadas: ${total}.`;
  } else if (intent === "campaigns") {
    result = await getMetaCampaignsAction(baseParams);
    summary = summarizeRows(result.data, "Campanhas");
  } else if (intent === "ads") {
    result = await getMetaAdsAction(baseParams);
    summary = summarizeRows(result.data, "Anuncios");
  } else if (intent === "overview") {
    result = await getMetaAccountOverviewAction(baseParams);
    const name = (result.data as { overview?: { name?: string } })?.overview?.name;
    const currency = (result.data as { overview?: { currency?: string } })?.overview?.currency;
    const account = getAccountLabel(result.data);
    summary = `Overview da conta carregado${name ? ` para ${name}` : ""}. Conta usada: ${account}.${currency ? ` Moeda: ${currency}.` : ""}`;
  } else {
    if (intent === "performance_analysis") {
      result = await analyzeMetaAccountAction(baseParams);
      summary = formatAnalysisSummary(result.data);
    } else if (intent === "performance_summary") {
      result = await generateMetaPerformanceSummaryAction(baseParams);
      const executive = (result.data as AnalysisPayload | undefined)?.executiveSummary;
      summary = executive || formatAnalysisSummary(result.data);
    } else if (intent === "performance_alerts") {
      result = await listMetaPerformanceAlertsAction(baseParams);
      summary = formatAlerts(result.data);
    } else if (intent === "worst_campaigns") {
      result = await analyzeMetaAccountAction(baseParams);
      summary = formatWorstItems(result.data, "campaign");
    } else if (intent === "worst_ads") {
      result = await analyzeMetaAccountAction(baseParams);
      summary = formatWorstItems(result.data, "ad");
    } else {
      result = await getMetaInsightsAction(baseParams);
      summary = summarizeInsights(result.data);
    }
  }

  const message = result.ok
    ? `Agente de Ads executado com sucesso. ${summary}`
    : result.missingEnv?.length
      ? buildConfigMissingMessage(result)
      : `Falha ao consultar Meta Ads: ${result.error || "erro desconhecido"}.`;

  return {
    agent: "ads",
    message,
    toolsAvailable: adsTools.map((tool) => tool.name),
    route,
    data: {
      promptLoaded: adsAgentPrompt.trim().length > 0,
      stage: "meta-read",
      intent,
      result,
    },
  };
}
