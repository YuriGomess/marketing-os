import {
  MetaIntegrationError,
  classifyMetaError,
  getMetaEnvironmentStatus,
} from "./client";
import { getMetaAccountOverview } from "./reports";
import { listMetaAdAccounts } from "./accounts";
import { prisma } from "@/lib/prisma";

export type MetaHealthResult = {
  configured: boolean;
  accountIdPresent: boolean;
  apiReachable: boolean;
  accountReadable: boolean;
  message: string;
  foundEnv: string[];
  missingEnv: string[];
  errorCategory?: string;
  apiAccountsCount?: number;
  syncedAccountsCount?: number;
};

export async function runMetaHealthCheck(accountId?: string): Promise<MetaHealthResult> {
  const env = getMetaEnvironmentStatus();
  const accountIdPresent = Boolean(accountId || process.env.META_AD_ACCOUNT_ID);
  const syncedAccountsCount = await prisma.integrationAccount.count({
    where: { provider: "META_ADS" },
  });

  if (env.missingEssential.length > 0) {
    return {
      configured: false,
      accountIdPresent,
      apiReachable: false,
      accountReadable: false,
      message: `Configuracao Meta incompleta. Faltando: ${env.missingEssential.join(", ")}.`,
      foundEnv: env.found,
      missingEnv: env.missingEssential,
      errorCategory: "missing_config",
      syncedAccountsCount,
    };
  }

  try {
    const apiAccounts = await listMetaAdAccounts();
    await getMetaAccountOverview({ accountId });
    return {
      configured: true,
      accountIdPresent: true,
      apiReachable: true,
      accountReadable: true,
      message: "Integracao Meta configurada e leitura da conta validada.",
      foundEnv: env.found,
      missingEnv: [],
      apiAccountsCount: apiAccounts.length,
      syncedAccountsCount,
    };
  } catch (error) {
    if (error instanceof MetaIntegrationError) {
      const classified = classifyMetaError(error);
      return {
        configured: true,
        accountIdPresent,
        apiReachable: error.code !== "invalid_response",
        accountReadable: false,
        message: error.message,
        foundEnv: env.found,
        missingEnv: error.missingVars || [],
        errorCategory: classified.category,
        syncedAccountsCount,
      };
    }

    return {
      configured: true,
      accountIdPresent,
      apiReachable: false,
      accountReadable: false,
      message: error instanceof Error ? error.message : "Erro inesperado no health check Meta.",
      foundEnv: env.found,
      missingEnv: [],
      errorCategory: "unknown",
      syncedAccountsCount,
    };
  }
}
