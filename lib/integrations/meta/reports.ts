import { metaGet, normalizeAdAccountId } from "./client";
import {
  normalizeMetaActions,
  type MetaNormalizedActions,
} from "@/lib/integrations/meta/actions-parser";

type MetaDataList<T> = {
  data: T[];
  paging?: unknown;
};

type MetaAccountResponse = {
  id?: string;
  name?: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  timezone_offset_hours_utc?: number;
};

export type MetaAccountOverviewParams = {
  accountId?: string;
  fields?: string[];
};

export type MetaInsightsParams = {
  accountId?: string;
  datePreset?: string;
  days?: number;
  level?: "account" | "campaign" | "adset" | "ad";
  fields?: string[];
  limit?: number;
};

export type MetaInsightsRow = {
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
  cpc: number;
  cpm: number;
  ctr: number;
  actions: MetaNormalizedActions;
  raw: Record<string, unknown>;
};

const defaultOverviewFields = [
  "id",
  "name",
  "account_status",
  "currency",
  "timezone_name",
  "timezone_offset_hours_utc",
];

const defaultInsightsFields = [
  "account_name",
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "date_start",
  "date_stop",
  "spend",
  "impressions",
  "reach",
  "clicks",
  "cpc",
  "cpm",
  "ctr",
  "actions",
  "action_values",
  "cost_per_action_type",
  "purchase_roas",
  "objective",
  "optimization_goal",
];

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateRange(days: number): { since: string; until: string } {
  const safeDays = Math.max(1, Math.floor(days));
  const now = new Date();
  const untilDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sinceDate = new Date(untilDate);
  sinceDate.setUTCDate(untilDate.getUTCDate() - (safeDays - 1));

  const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

  return {
    since: toIsoDate(sinceDate),
    until: toIsoDate(untilDate),
  };
}

function normalizeInsightRow(row: Record<string, unknown>): MetaInsightsRow {
  return {
    account_name: typeof row.account_name === "string" ? row.account_name : undefined,
    campaign_name: typeof row.campaign_name === "string" ? row.campaign_name : undefined,
    adset_name: typeof row.adset_name === "string" ? row.adset_name : undefined,
    ad_name: typeof row.ad_name === "string" ? row.ad_name : undefined,
    date_start: typeof row.date_start === "string" ? row.date_start : undefined,
    date_stop: typeof row.date_stop === "string" ? row.date_stop : undefined,
    objective: typeof row.objective === "string" ? row.objective : null,
    optimization_goal:
      typeof row.optimization_goal === "string" ? row.optimization_goal : null,
    spend: toNumber(row.spend),
    impressions: toNumber(row.impressions),
    reach: toNumber(row.reach),
    clicks: toNumber(row.clicks),
    cpc: toNumber(row.cpc),
    cpm: toNumber(row.cpm),
    ctr: toNumber(row.ctr),
    actions: normalizeMetaActions({
      actions: row.actions,
      actionValues: row.action_values,
      costPerActionType: row.cost_per_action_type,
      purchaseRoas: row.purchase_roas,
      clicks: row.clicks,
    }),
    raw: row,
  };
}

export async function getMetaAccountOverview(params: MetaAccountOverviewParams) {
  const accountId = normalizeAdAccountId(params.accountId);
  const fields = (params.fields?.length ? params.fields : defaultOverviewFields).join(",");

  const response = await metaGet<MetaAccountResponse>(accountId, { fields });
  return {
    accountId,
    overview: response,
  };
}

export async function getMetaInsights(params: MetaInsightsParams) {
  const accountId = normalizeAdAccountId(params.accountId);
  const fields = (params.fields?.length ? params.fields : defaultInsightsFields).join(",");

  const dateRange = typeof params.days === "number" ? toDateRange(params.days) : null;

  const response = await metaGet<MetaDataList<Record<string, unknown>>>(
    `${accountId}/insights`,
    {
      fields,
      date_preset: dateRange ? undefined : params.datePreset || "last_7d",
      time_range: dateRange ? JSON.stringify(dateRange) : undefined,
      level: params.level || "campaign",
      limit: params.limit || 25,
    },
  );

  return {
    accountId,
    rows: response.data.map((row) => normalizeInsightRow(row)),
    paging: response.paging,
  };
}
