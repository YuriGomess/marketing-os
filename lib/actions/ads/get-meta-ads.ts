import {
  MetaIntegrationError,
  classifyMetaError,
  getMetaEnvironmentStatus,
} from "@/lib/integrations/meta/client";
import { getMetaAds } from "@/lib/integrations/meta/ads";
import { resolveMetaAdAccount } from "./resolve-meta-ad-account";

export async function getMetaAdsAction(params: Record<string, unknown>) {
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
    const resolved = await resolveMetaAdAccount({
      accountId: typeof params.accountId === "string" ? params.accountId : undefined,
      accountName: typeof params.accountName === "string" ? params.accountName : undefined,
      clientId: typeof params.clientId === "string" ? params.clientId : undefined,
      clientName: typeof params.clientName === "string" ? params.clientName : undefined,
    });

    const data = await getMetaAds({
      accountId: resolved.accountId,
      limit: typeof params.limit === "number" ? params.limit : undefined,
    });

    return { ok: true, data: { ...data, resolvedAccount: resolved } };
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
      error: error instanceof Error ? error.message : "Falha ao listar anuncios Meta.",
    };
  }
}
