import { metaGet, normalizeAdAccountId } from "./client";

type MetaDataList<T> = {
  data: T[];
  paging?: unknown;
};

export type MetaAd = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
};

export type MetaAdsParams = {
  accountId?: string;
  limit?: number;
  fields?: string[];
};

const defaultAdFields = ["id", "name", "status", "effective_status"];

export async function getMetaAds(params: MetaAdsParams) {
  const accountId = normalizeAdAccountId(params.accountId);
  const fields = (params.fields?.length ? params.fields : defaultAdFields).join(",");

  const response = await metaGet<MetaDataList<MetaAd>>(`${accountId}/ads`, {
    fields,
    limit: params.limit || 25,
  });

  return {
    accountId,
    rows: response.data,
    paging: response.paging,
  };
}
