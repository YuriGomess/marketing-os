import type { AgentContext, AgentExecutionResult, AgentRouteResult } from "@/lib/ai/types";
import { adsAgentPrompt } from "./prompt";
import { adsTools } from "./tools";
import { getMetaAccountOverviewAction } from "@/lib/actions/ads/get-meta-account-overview";
import { getMetaCampaignsAction } from "@/lib/actions/ads/get-meta-campaigns";
import { getMetaAdsAction } from "@/lib/actions/ads/get-meta-ads";
import { getMetaInsightsAction } from "@/lib/actions/ads/get-meta-insights";
import { syncMetaAdAccountsAction } from "@/lib/actions/ads/sync-meta-ad-accounts";
import { getMetaAdAccountsAction } from "@/lib/actions/ads/get-meta-ad-accounts";

type ActionResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  errorCategory?: string;
  missingEnv?: string[];
  foundEnv?: string[];
  details?: unknown;
};

function summarizeRows(data: unknown, label: string): string {
  const rows = (data as { rows?: unknown[] })?.rows;
  const count = Array.isArray(rows) ? rows.length : 0;
  return `${label}: ${count} registro(s) encontrados.`;
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

  let intent: "accounts_list" | "accounts_sync" | "overview" | "campaigns" | "ads" | "insights" = "insights";
  if (mentionsAccountsSync) {
    intent = "accounts_sync";
  } else if (mentionsAccountsList) {
    intent = "accounts_list";
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
    summary = `Overview da conta carregado${name ? ` para ${name}` : ""}.`;
  } else {
    result = await getMetaInsightsAction(baseParams);
    summary = summarizeRows(result.data, "Insights");
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
