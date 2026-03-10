import { prisma } from "@/lib/prisma";
import {
  MetaIntegrationError,
  classifyMetaError,
  getMetaEnvironmentStatus,
} from "@/lib/integrations/meta/client";
import { listMetaAdAccounts } from "@/lib/integrations/meta/accounts";

export async function syncMetaAdAccountsAction(params: Record<string, unknown>) {
  const env = getMetaEnvironmentStatus();
  if (env.missingEssential.length > 0) {
    return {
      ok: false,
      error: "Configuracao Meta incompleta.",
      errorCategory: "missing_config",
      missingEnv: env.missingEssential,
      foundEnv: env.found,
    };
  }

  try {
    const discovered = await listMetaAdAccounts();
    const provider = "META_ADS" as const;

    const explicitIntegrationId =
      typeof params.integrationId === "string" ? params.integrationId : undefined;

    const existingIntegration = explicitIntegrationId
      ? await prisma.integration.findUnique({ where: { id: explicitIntegrationId } })
      : await prisma.integration.findFirst({
          where: { provider },
          orderBy: { createdAt: "asc" },
        });

    const integration = existingIntegration
      ? await prisma.integration.update({
          where: { id: existingIntegration.id },
          data: {
            provider,
            accountId:
              discovered[0]?.externalAccountId ||
              existingIntegration.accountId ||
              process.env.META_AD_ACCOUNT_ID ||
              "act_unknown",
            accountName: existingIntegration.accountName || "Meta Principal",
            status: "ACTIVE",
          },
        })
      : await prisma.integration.create({
          data: {
            id: explicitIntegrationId,
            provider,
            accountName: "Meta Principal",
            accountId:
              discovered[0]?.externalAccountId ||
              process.env.META_AD_ACCOUNT_ID ||
              "act_unknown",
            status: "ACTIVE",
          },
        });

    let synced = 0;
    for (const account of discovered) {
      const existing = await prisma.integrationAccount.findFirst({
        where: {
          integrationId: integration.id,
          externalAccountId: account.externalAccountId,
        },
      });

      await prisma.integrationAccount.upsert({
        where: {
          integrationId_externalAccountId: {
            integrationId: integration.id,
            externalAccountId: account.externalAccountId,
          },
        },
        create: {
          integrationId: integration.id,
          clientId: existing?.clientId,
          provider,
          externalAccountId: account.externalAccountId,
          externalAccountName: account.externalAccountName,
          currency: account.currency,
          timezoneName: account.timezoneName,
          status: account.status,
          isActive: true,
          isDefault: false,
          metadata: account.raw,
        },
        update: {
          externalAccountName: account.externalAccountName,
          currency: account.currency,
          timezoneName: account.timezoneName,
          status: account.status,
          isActive: true,
          metadata: account.raw,
          clientId: existing?.clientId,
        },
      });
      synced += 1;
    }

    const hasDefault = await prisma.integrationAccount.findFirst({
      where: { integrationId: integration.id, provider, isDefault: true },
    });

    if (!hasDefault) {
      const firstAccount = await prisma.integrationAccount.findFirst({
        where: { integrationId: integration.id, provider, isActive: true },
        orderBy: { createdAt: "asc" },
      });

      if (firstAccount) {
        await prisma.integrationAccount.update({
          where: { id: firstAccount.id },
          data: { isDefault: true },
        });
      }
    }

    const total = await prisma.integrationAccount.count({
      where: { integrationId: integration.id, provider },
    });

    return {
      ok: true,
      data: {
        synced,
        total,
        integrationId: integration.id,
      },
    };
  } catch (error) {
    if (error instanceof MetaIntegrationError) {
      const classified = classifyMetaError(error);
      return {
        ok: false,
        error: error.message,
        errorCategory: classified.category,
        missingEnv: error.missingVars,
        details: error.details,
      };
    }

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao sincronizar contas Meta no banco.",
      errorCategory: "unknown",
    };
  }
}
