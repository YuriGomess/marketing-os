type MetaParamValue = string | number | boolean;

export type MetaClientConfig = {
  accessToken?: string;
  accountId?: string;
  apiVersion?: string;
};

export type MetaEnvStatus = {
  found: string[];
  missingEssential: string[];
};

export class MetaIntegrationError extends Error {
  code: "config_missing" | "http_error" | "api_error" | "invalid_response";
  status?: number;
  missingVars?: string[];
  details?: unknown;

  constructor(
    message: string,
    options: {
      code: "config_missing" | "http_error" | "api_error" | "invalid_response";
      status?: number;
      missingVars?: string[];
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "MetaIntegrationError";
    this.code = options.code;
    this.status = options.status;
    this.missingVars = options.missingVars;
    this.details = options.details;
  }
}

export type MetaErrorCategory =
  | "missing_config"
  | "invalid_token"
  | "insufficient_permission"
  | "invalid_account_id"
  | "app_permission_missing"
  | "api_unreachable"
  | "unknown";

function trimTrailingSlash(input: string): string {
  return input.endsWith("/") ? input.slice(0, -1) : input;
}

function getApiVersion(config?: MetaClientConfig): string {
  return config?.apiVersion || process.env.META_API_VERSION || "v23.0";
}

function getAccessToken(config?: MetaClientConfig): string | undefined {
  return config?.accessToken || process.env.META_ACCESS_TOKEN;
}

export function getMetaEnvironmentStatus(): MetaEnvStatus {
  const found: string[] = [];
  const missingEssential: string[] = [];

  const maybeVars = [
    "META_APP_ID",
    "META_APP_SECRET",
    "META_ACCESS_TOKEN",
    "META_AD_ACCOUNT_ID",
    "META_API_VERSION",
  ] as const;

  for (const key of maybeVars) {
    if (process.env[key]) {
      found.push(key);
    }
  }

  const essential = ["META_ACCESS_TOKEN"] as const;
  for (const key of essential) {
    if (!process.env[key]) {
      missingEssential.push(key);
    }
  }

  return { found, missingEssential };
}

export function getMetaApiBaseUrl(config?: MetaClientConfig): string {
  const explicitBase = process.env.META_GRAPH_API_BASE_URL;
  if (explicitBase) {
    return trimTrailingSlash(explicitBase);
  }

  return `https://graph.facebook.com/${getApiVersion(config)}`;
}

export function normalizeAdAccountId(accountId?: string): string {
  const raw = accountId || process.env.META_AD_ACCOUNT_ID || "";
  if (!raw) {
    throw new MetaIntegrationError(
      "Configuracao Meta incompleta: META_AD_ACCOUNT_ID nao encontrado.",
      { code: "config_missing", missingVars: ["META_AD_ACCOUNT_ID"] },
    );
  }

  return raw.startsWith("act_") ? raw : `act_${raw}`;
}

export function buildMetaUrl(
  path: string,
  params: Record<string, MetaParamValue | undefined> = {},
  config?: MetaClientConfig,
): string {
  const base = getMetaApiBaseUrl(config);
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(`${base}/${normalizedPath}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export async function metaGet<T = unknown>(
  path: string,
  params: Record<string, MetaParamValue | undefined> = {},
  config?: MetaClientConfig,
): Promise<T> {
  const accessToken = getAccessToken(config);

  if (!accessToken) {
    throw new MetaIntegrationError(
      "Configuracao Meta incompleta: META_ACCESS_TOKEN nao encontrado.",
      { code: "config_missing", missingVars: ["META_ACCESS_TOKEN"] },
    );
  }

  const url = buildMetaUrl(path, { ...params, access_token: accessToken }, config);
  const response = await fetch(url, { method: "GET", cache: "no-store" });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new MetaIntegrationError("Resposta invalida da Meta Graph API.", {
      code: "invalid_response",
      status: response.status,
    });
  }

  if (!response.ok) {
    const maybeError = (payload as { error?: { message?: string } })?.error;
    throw new MetaIntegrationError(
      maybeError?.message || "Falha na chamada HTTP da Meta Graph API.",
      {
        code: "http_error",
        status: response.status,
        details: payload,
      },
    );
  }

  const apiError = (payload as { error?: { message?: string } })?.error;
  if (apiError) {
    throw new MetaIntegrationError(
      apiError.message || "Meta Graph API retornou erro.",
      {
        code: "api_error",
        status: response.status,
        details: payload,
      },
    );
  }

  return payload as T;
}

export function classifyMetaError(error: unknown): {
  category: MetaErrorCategory;
  message: string;
} {
  if (!(error instanceof MetaIntegrationError)) {
    return {
      category: "unknown",
      message: error instanceof Error ? error.message : "Erro desconhecido na integracao Meta.",
    };
  }

  if (error.code === "config_missing") {
    return { category: "missing_config", message: error.message };
  }

  if (error.code === "http_error" || error.code === "api_error") {
    const payload = error.details as
      | {
          error?: {
            message?: string;
            code?: number;
            error_subcode?: number;
            type?: string;
          };
        }
      | undefined;

    const metaError = payload?.error;
    const code = metaError?.code;
    const subcode = metaError?.error_subcode;
    const message = (metaError?.message || error.message || "").toLowerCase();

    if (code === 190 || message.includes("invalid oauth") || message.includes("access token")) {
      return { category: "invalid_token", message: error.message };
    }

    if (
      code === 200 ||
      code === 10 ||
      message.includes("permissions") ||
      message.includes("permission") ||
      message.includes("not authorized")
    ) {
      return { category: "insufficient_permission", message: error.message };
    }

    if (
      code === 100 ||
      subcode === 33 ||
      message.includes("unsupported get request") ||
      message.includes("object with id")
    ) {
      return { category: "invalid_account_id", message: error.message };
    }

    if (message.includes("app") && message.includes("permission")) {
      return { category: "app_permission_missing", message: error.message };
    }

    return { category: "api_unreachable", message: error.message };
  }

  return { category: "unknown", message: error.message };
}
