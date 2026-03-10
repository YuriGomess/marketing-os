import { metaGet, normalizeAdAccountId } from "./client";

type MetaDataList<T> = {
  data: T[];
  paging?: unknown;
};

type MetaAdAccountApi = {
  id?: string;
  account_id?: string;
  name?: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
};

export type MetaAdAccount = {
  externalAccountId: string;
  externalAccountName: string;
  currency?: string;
  timezoneName?: string;
  status?: string;
  raw: MetaAdAccountApi;
};

export async function listMetaAdAccounts(): Promise<MetaAdAccount[]> {
  const response = await metaGet<MetaDataList<MetaAdAccountApi>>("me/adaccounts", {
    fields: "id,account_id,name,currency,timezone_name,account_status",
    limit: 200,
  });

  return (response.data || []).map((account) => {
    const normalized = normalizeAdAccountId(account.id || account.account_id || "");
    return {
      externalAccountId: normalized,
      externalAccountName: account.name || normalized,
      currency: account.currency,
      timezoneName: account.timezone_name,
      status:
        account.account_status !== undefined
          ? String(account.account_status)
          : undefined,
      raw: account,
    };
  });
}
