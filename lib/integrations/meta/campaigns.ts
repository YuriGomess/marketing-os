import { metaGet, normalizeAdAccountId } from "./client";

type MetaDataList<T> = {
  data: T[];
  paging?: unknown;
};

export type MetaCampaign = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
};

export type MetaCampaignsParams = {
  accountId?: string;
  limit?: number;
  fields?: string[];
};

const defaultCampaignFields = ["id", "name", "status", "effective_status"];

export async function getMetaCampaigns(params: MetaCampaignsParams) {
  const accountId = normalizeAdAccountId(params.accountId);
  const fields = (params.fields?.length ? params.fields : defaultCampaignFields).join(",");

  const response = await metaGet<MetaDataList<MetaCampaign>>(`${accountId}/campaigns`, {
    fields,
    limit: params.limit || 25,
  });

  return {
    accountId,
    rows: response.data,
    paging: response.paging,
  };
}
