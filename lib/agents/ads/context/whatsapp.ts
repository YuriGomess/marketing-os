import { classifyCampaignAnalysisType } from "@/lib/agents/ads/context/campaign-type";
import { aggregateRows, fetchInsightsByLevel, topRowsBy } from "@/lib/agents/ads/context/shared";
import type { AdsContextInput } from "@/lib/agents/ads/context/types";

export async function getMetaWhatsappAnalysisContextAction(params: Record<string, unknown>) {
  const input: AdsContextInput = {
    accountId: typeof params.accountId === "string" ? params.accountId : undefined,
    accountName: typeof params.accountName === "string" ? params.accountName : undefined,
    clientName: typeof params.clientName === "string" ? params.clientName : undefined,
    clientId: typeof params.clientId === "string" ? params.clientId : undefined,
    datePreset: typeof params.datePreset === "string" ? params.datePreset : "last_7d",
    days: typeof params.days === "number" ? params.days : undefined,
    limit: typeof params.limit === "number" ? params.limit : 100,
    userMessage: typeof params.userMessage === "string" ? params.userMessage : undefined,
  };

  const [campaignData, adData] = await Promise.all([
    fetchInsightsByLevel("campaign", input),
    fetchInsightsByLevel("ad", input),
  ]);

  if (!campaignData.ok) return campaignData;
  if (!adData.ok) return adData;

  const campaignTotals = aggregateRows(campaignData.rows);
  const adTotals = aggregateRows(adData.rows);
  const classification = classifyCampaignAnalysisType({
    userMessage: input.userMessage,
    rows: campaignData.rows,
  });

  return {
    ok: true,
    data: {
      campaignType: classification.type,
      campaignTypeConfidence: classification.confidence,
      campaignTypeReason: classification.reason,
      evidence: classification.evidence,
      account: {
        accountId: input.accountId || null,
        accountName: input.accountName || null,
        clientId: input.clientId || null,
      },
      period: {
        datePreset: input.datePreset,
        days: input.days || null,
      },
      totals: campaignTotals,
      whatsapp: {
        messagingConversations: campaignTotals.actions.messagingConversations,
        costPerMessage: campaignTotals.derived.costPerMessage,
        leads: campaignTotals.actions.leads,
        leadPerMessageRate:
          campaignTotals.actions.messagingConversations > 0
            ? Number(
                (
                  (campaignTotals.actions.leads * 100) /
                  campaignTotals.actions.messagingConversations
                ).toFixed(4),
              )
            : 0,
      },
      levelSummaries: {
        campaign: campaignTotals,
        ad: adTotals,
      },
      leaders: {
        topMessageCampaigns: topRowsBy(campaignData.rows, "spend", 6),
        topMessageAds: topRowsBy(adData.rows, "spend", 6),
      },
      warnings: [
        classification.confidence < 0.65
          ? "Classificacao de tipo de campanha com baixa confianca."
          : null,
        campaignTotals.actions.messagingConversations <= 0
          ? "Nao foram encontrados eventos claros de conversa por mensagem no periodo."
          : null,
      ].filter((value): value is string => Boolean(value)),
    },
  };
}
