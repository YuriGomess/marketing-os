type EvolutionHttpMethod = "GET" | "POST";

export class EvolutionIntegrationError extends Error {
  code: "missing_config" | "http_error" | "invalid_response";
  status?: number;
  details?: unknown;

  constructor(
    message: string,
    options: {
      code: "missing_config" | "http_error" | "invalid_response";
      status?: number;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "EvolutionIntegrationError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

function trimSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getEvolutionConfigStatus() {
  const baseUrl = process.env.EVOLUTION_API_BASE_URL?.trim() || "";
  const apiKey = process.env.EVOLUTION_API_KEY?.trim() || "";

  const missing: string[] = [];
  if (!baseUrl) missing.push("EVOLUTION_API_BASE_URL");
  if (!apiKey) missing.push("EVOLUTION_API_KEY");

  return {
    ok: missing.length === 0,
    missing,
    baseUrl: baseUrl ? trimSlash(baseUrl) : "",
    apiKey,
  };
}

export async function evolutionRequest(input: {
  method: EvolutionHttpMethod;
  path: string;
  body?: Record<string, unknown>;
}): Promise<unknown> {
  const config = getEvolutionConfigStatus();

  if (!config.ok) {
    throw new EvolutionIntegrationError(
      `Configuracao Evolution incompleta: ${config.missing.join(", ")}`,
      {
        code: "missing_config",
      },
    );
  }

  const url = `${config.baseUrl}${input.path.startsWith("/") ? "" : "/"}${input.path}`;

  const response = await fetch(url, {
    method: input.method,
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!response.ok) {
    throw new EvolutionIntegrationError(
      `Falha HTTP Evolution (${response.status}) em ${input.path}.`,
      {
        code: "http_error",
        status: response.status,
        details: parsed,
      },
    );
  }

  return parsed;
}
