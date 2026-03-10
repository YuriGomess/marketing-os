import type { AIToolDefinition } from "./types";
import { getMetaReportAction } from "@/lib/actions/meta/get-meta-report";
import { pauseMetaCampaignAction } from "@/lib/actions/meta/pause-meta-campaign";

export const toolRegistry: AIToolDefinition[] = [
  {
    name: "meta.get_report",
    description: "Retorna um resumo de desempenho de campanhas do Meta Ads.",
    provider: "META_ADS",
    execute: async (params) => getMetaReportAction(params),
  },
  {
    name: "meta.pause_campaign",
    description: "Solicita pausa de uma campanha no Meta Ads.",
    provider: "META_ADS",
    execute: async (params) => pauseMetaCampaignAction(params),
  },
];

