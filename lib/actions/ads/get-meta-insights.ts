import {
  MetaIntegrationError,
  classifyMetaError,
  getMetaEnvironmentStatus,
} from "@/lib/integrations/meta/client";
import { getMetaInsights } from "@/lib/integrations/meta/reports";
import { resolveMetaAdAccount } from "./resolve-meta-ad-account";

export async function getMetaInsightsAction(params: Record<string, unknown>) {
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

    const data = await getMetaInsights({
      accountId: resolved.accountId,
      datePreset: typeof params.datePreset === "string" ? params.datePreset : undefined,
      days: typeof params.days === "number" ? params.days : undefined,
      level:
        params.level === "account" ||
        params.level === "campaign" ||
        params.level === "adset" ||
        params.level === "ad"
          ? params.level
          : undefined,
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
      error: error instanceof Error ? error.message : "Falha ao buscar insights Meta.",
    };
  }
}
