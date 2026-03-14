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
  clientName?: string;
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

function scoreNameMatch(target: string, candidate: string): number {
  const normalizedTarget = normalizeName(target);
  const normalizedCandidate = normalizeName(candidate);

  if (!normalizedTarget || !normalizedCandidate) return 0;
  if (normalizedCandidate === normalizedTarget) return 100;
  if (normalizedCandidate.includes(normalizedTarget)) return 80;
  if (normalizedTarget.includes(normalizedCandidate)) return 70;

  const targetTokens = normalizedTarget.split(/\s+/).filter(Boolean);
  const candidateTokens = normalizedCandidate.split(/\s+/).filter(Boolean);
  const overlap = targetTokens.filter((token) => candidateTokens.includes(token)).length;

  if (overlap === 0) return 0;
  return Math.round((overlap / Math.max(targetTokens.length, 1)) * 60);
}

async function resolveClientIdByName(clientName?: string): Promise<string | undefined> {
  if (!clientName) return undefined;

  const search = clientName.trim();
  if (!search) return undefined;

  const candidates = await prisma.cliente.findMany({
    where: {
      OR: [
        { nome: { contains: search, mode: "insensitive" } },
        { empresa: { contains: search, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      nome: true,
      empresa: true,
    },
    take: 20,
  });

  if (candidates.length === 0) return undefined;

  const ranked = candidates
    .map((candidate) => ({
      id: candidate.id,
      score: Math.max(
        scoreNameMatch(search, candidate.nome || ""),
        scoreNameMatch(search, candidate.empresa || ""),
      ),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0].id : undefined;
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

  const resolvedClientId =
    params.clientId || (await resolveClientIdByName(params.clientName || params.accountName));

  const accounts = await prisma.integrationAccount.findMany({
    where: {
      provider: "META_ADS",
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  const candidateAccountName = params.accountName || params.clientName;

  if (candidateAccountName) {
    const byName = accounts
      .map((account) => ({
        account,
        score: scoreNameMatch(candidateAccountName, account.externalAccountName || ""),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (byName && byName.score > 0) {
      return {
        accountId: byName.account.externalAccountId,
        accountName: byName.account.externalAccountName,
        source: "account_name",
      };
    }
  }

  if (resolvedClientId) {
    const byClient = accounts.find((account) => account.clientId === resolvedClientId);
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
