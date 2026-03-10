import type { AgentToolDefinition } from "@/lib/ai/types";

export const adsTools: AgentToolDefinition[] = [
  {
    name: "syncMetaAdAccounts",
    description: "Descobre contas acessiveis pelo token e sincroniza no banco.",
    action: "syncMetaAdAccountsAction",
    inputSchema: {},
  },
  {
    name: "getMetaAdAccounts",
    description: "Lista contas Meta sincronizadas no sistema.",
    action: "getMetaAdAccountsAction",
    inputSchema: {
      clientId: "string?",
    },
  },
  {
    name: "getMetaAccountOverview",
    description: "Retorna visao geral da conta Meta Ads em um periodo.",
    action: "getMetaAccountOverviewAction",
    inputSchema: {
      accountId: "string?",
    },
  },
  {
    name: "getMetaCampaigns",
    description: "Lista campanhas com status e metricas resumidas.",
    action: "getMetaCampaignsAction",
    inputSchema: {
      accountId: "string?",
      limit: "number?",
    },
  },
  {
    name: "getMetaAds",
    description: "Lista anuncios e principais indicadores por campanha.",
    action: "getMetaAdsAction",
    inputSchema: {
      accountId: "string?",
      limit: "number?",
    },
  },
  {
    name: "getMetaInsights",
    description: "Retorna insights de performance por dimensao selecionada.",
    action: "getMetaInsightsAction",
    inputSchema: {
      accountId: "string?",
      datePreset: "string? (ex: last_7d)",
      level: "account|campaign|adset|ad ?",
      limit: "number?",
    },
  },
  {
    name: "analyzeMetaPerformance",
    description: "Analisa indicadores como CTR, CPA e ROAS e sugere foco de otimizacao.",
    inputSchema: {
      accountId: "string",
      objective: "string?",
      dateFrom: "string (YYYY-MM-DD)",
      dateTo: "string (YYYY-MM-DD)",
    },
  },
  {
    name: "generateMetaExecutiveSummary",
    description: "Gera resumo executivo com destaques e riscos principais.",
    inputSchema: {
      accountId: "string",
      audience: "string?",
      dateFrom: "string (YYYY-MM-DD)",
      dateTo: "string (YYYY-MM-DD)",
    },
  },
];
