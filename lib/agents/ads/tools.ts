import type { AgentToolDefinition } from "@/lib/ai/types";
import { syncMetaAdAccountsAction } from "@/lib/actions/ads/sync-meta-ad-accounts";
import { getMetaAdAccountsAction } from "@/lib/actions/ads/get-meta-ad-accounts";
import { getMetaAccountOverviewAction } from "@/lib/actions/ads/get-meta-account-overview";
import { getMetaCampaignsAction } from "@/lib/actions/ads/get-meta-campaigns";
import { getMetaAdsAction } from "@/lib/actions/ads/get-meta-ads";
import { getMetaInsightsAction } from "@/lib/actions/ads/get-meta-insights";
import { analyzeMetaAccountAction } from "@/lib/actions/ads/analyze-meta-account";
import {
  generateMetaPerformanceSummaryAction,
  listMetaPerformanceAlertsAction,
} from "@/lib/actions/ads/generate-meta-summary";
import { getMetaAccountDeepContextAction } from "@/lib/agents/ads/context-builder";

export const adsTools: AgentToolDefinition[] = [
  {
    name: "syncMetaAdAccounts",
    description: "Descobre contas acessiveis pelo token e sincroniza no banco.",
    action: "syncMetaAdAccountsAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        integrationId: { type: "string" },
      },
    },
    execute: async (params) => syncMetaAdAccountsAction(params),
  },
  {
    name: "getMetaAdAccounts",
    description: "Lista contas Meta sincronizadas no sistema.",
    action: "getMetaAdAccountsAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        clientId: { type: "string" },
      },
    },
    execute: async (params) => getMetaAdAccountsAction(params),
  },
  {
    name: "getMetaAccountOverview",
    description: "Retorna visao geral da conta Meta Ads em um periodo.",
    action: "getMetaAccountOverviewAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        accountName: { type: "string" },
        clientId: { type: "string" },
      },
    },
    execute: async (params) => getMetaAccountOverviewAction(params),
  },
  {
    name: "getMetaCampaigns",
    description: "Lista campanhas com status e metricas resumidas.",
    action: "getMetaCampaignsAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        accountName: { type: "string" },
        clientId: { type: "string" },
        limit: { type: "number" },
      },
    },
    execute: async (params) => getMetaCampaignsAction(params),
  },
  {
    name: "getMetaAds",
    description: "Lista anuncios e principais indicadores por campanha.",
    action: "getMetaAdsAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        accountName: { type: "string" },
        clientId: { type: "string" },
        limit: { type: "number" },
      },
    },
    execute: async (params) => getMetaAdsAction(params),
  },
  {
    name: "getMetaInsights",
    description: "Retorna insights de performance por dimensao selecionada.",
    action: "getMetaInsightsAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        accountName: { type: "string" },
        clientId: { type: "string" },
        datePreset: { type: "string" },
        level: { type: "string", enum: ["account", "campaign", "adset", "ad"] },
        limit: { type: "number" },
      },
    },
    execute: async (params) => getMetaInsightsAction(params),
  },
  {
    name: "analyzeMetaAccount",
    description: "Analisa indicadores como CTR, CPA e ROAS e sugere foco de otimizacao.",
    action: "analyzeMetaAccountAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        accountName: { type: "string" },
        clientId: { type: "string" },
        datePreset: { type: "string" },
        limit: { type: "number" },
      },
    },
    execute: async (params) => analyzeMetaAccountAction(params),
  },
  {
    name: "getMetaAccountDeepContext",
    description:
      "Monta contexto profundo da conta com risco, alertas, foco tatico e recomendacoes priorizadas.",
    action: "getMetaAccountDeepContextAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        accountName: { type: "string" },
        clientId: { type: "string" },
        datePreset: { type: "string" },
        limit: { type: "number" },
      },
    },
    execute: async (params) => getMetaAccountDeepContextAction(params),
  },
  {
    name: "generateMetaPerformanceSummary",
    description: "Gera resumo operacional com conta usada, alertas e prioridades.",
    action: "generateMetaPerformanceSummaryAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        accountName: { type: "string" },
        clientId: { type: "string" },
        datePreset: { type: "string" },
        limit: { type: "number" },
      },
    },
    execute: async (params) => generateMetaPerformanceSummaryAction(params),
  },
  {
    name: "listMetaPerformanceAlerts",
    description: "Lista alertas de performance e itens com maior atencao.",
    action: "listMetaPerformanceAlertsAction",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accountId: { type: "string" },
        accountName: { type: "string" },
        clientId: { type: "string" },
        datePreset: { type: "string" },
        limit: { type: "number" },
      },
    },
    execute: async (params) => listMetaPerformanceAlertsAction(params),
  },
];
