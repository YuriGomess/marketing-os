import { metaGet, normalizeAdAccountId } from "./client";

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
  level?: "account" | "campaign" | "adset" | "ad";
  fields?: string[];
  limit?: number;
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
  "campaign_name",
  "adset_name",
  "ad_name",
  "spend",
  "impressions",
  "reach",
  "clicks",
  "cpc",
  "cpm",
  "ctr",
];

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

  const response = await metaGet<MetaDataList<Record<string, unknown>>>(
    `${accountId}/insights`,
    {
      fields,
      date_preset: params.datePreset || "last_7d",
      level: params.level || "campaign",
      limit: params.limit || 25,
    },
  );

  return {
    accountId,
    rows: response.data,
    paging: response.paging,
  };
}
