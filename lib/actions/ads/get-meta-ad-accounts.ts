import { prisma } from "@/lib/prisma";

export async function getMetaAdAccountsAction(params: Record<string, unknown>) {
  const clientId = typeof params.clientId === "string" ? params.clientId : undefined;

  const accounts = await prisma.integrationAccount.findMany({
    where: {
      provider: "META_ADS",
      ...(clientId ? { clientId } : {}),
    },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return {
    ok: true,
    data: {
      total: accounts.length,
      defaultAccount: accounts.find((account) => account.isDefault) || null,
      linkedToClient: accounts.filter((account) => Boolean(account.clientId)).length,
      active: accounts.filter((account) => account.isActive).length,
      accounts,
    },
  };
}
