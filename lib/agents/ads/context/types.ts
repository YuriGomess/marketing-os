import type { DerivedAdsMetrics } from "@/lib/agents/ads/context/derived-metrics";
import type { MetaNormalizedActions } from "@/lib/integrations/meta/actions-parser";

export type CampaignAnalysisType = "ECOMMERCE" | "WHATSAPP" | "FOLLOWERS";

export type CampaignTypeDecision = {
  type: CampaignAnalysisType;
  confidence: number;
  reason: string;
  evidence: string[];
};

export type AdsContextInput = {
  accountId?: string;
  accountName?: string;
  clientId?: string;
  datePreset?: string;
  days?: number;
  limit?: number;
  userMessage?: string;
};

export type MetaInsightsLevel = "campaign" | "adset" | "ad";

export type MetaInsightRichRow = {
  account_name?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  date_start?: string;
  date_stop?: string;
  objective?: string | null;
  optimization_goal?: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  actions: MetaNormalizedActions;
};

export type AggregatedBaseMetrics = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  actions: MetaNormalizedActions;
  derived: DerivedAdsMetrics;
};
