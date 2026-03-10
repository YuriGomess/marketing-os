import { prisma } from "@/lib/prisma";
import {
  MetaIntegrationError,
  getMetaEnvironmentStatus,
  normalizeAdAccountId,
} from "@/lib/integrations/meta/client";

export type ResolveMetaAdAccountParams = {
  accountId?: string;
  accountName?: string;
  clientId?: string;
};

export type ResolvedMetaAdAccount = {
  accountId: string;
  accountName?: string;
  source:
    | "explicit_account_id"
    | "account_name"
    | "client_binding"
    | "default_db"
    | "env_fallback";
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function resolveMetaAdAccount(
  params: ResolveMetaAdAccountParams,
): Promise<ResolvedMetaAdAccount> {
  if (params.accountId) {
    return {
      accountId: normalizeAdAccountId(params.accountId),
      source: "explicit_account_id",
    };
  }

  const accounts = await prisma.integrationAccount.findMany({
    where: {
      provider: "META_ADS",
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  if (params.accountName) {
    const target = normalizeName(params.accountName);
    const byName = accounts.find((account) =>
      normalizeName(account.externalAccountName).includes(target),
    );

    if (byName) {
      return {
        accountId: byName.externalAccountId,
        accountName: byName.externalAccountName,
        source: "account_name",
      };
    }
  }

  if (params.clientId) {
    const byClient = accounts.find((account) => account.clientId === params.clientId);
    if (byClient) {
      return {
        accountId: byClient.externalAccountId,
        accountName: byClient.externalAccountName,
        source: "client_binding",
      };
    }
  }

  const defaultAccount = accounts.find((account) => account.isDefault);
  if (defaultAccount) {
    return {
      accountId: defaultAccount.externalAccountId,
      accountName: defaultAccount.externalAccountName,
      source: "default_db",
    };
  }

  const env = getMetaEnvironmentStatus();
  if (process.env.META_AD_ACCOUNT_ID) {
    return {
      accountId: normalizeAdAccountId(process.env.META_AD_ACCOUNT_ID),
      source: "env_fallback",
    };
  }

  throw new MetaIntegrationError(
    "Nenhuma conta Meta disponivel. Sincronize contas primeiro ou configure META_AD_ACCOUNT_ID.",
    {
      code: "config_missing",
      missingVars:
        env.missingEssential.length > 0
          ? env.missingEssential
          : ["META_AD_ACCOUNT_ID"],
    },
  );
}
