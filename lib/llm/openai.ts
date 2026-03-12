const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

type LLMRole = "system" | "user" | "assistant" | "tool";

export type LLMToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type LLMMessage = {
  role: LLMRole;
  content: string;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
};

export type LLMToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type OpenAIConfigStatus = {
  ok: boolean;
  missingEnv: string[];
  model: string;
  usedFallbackModel: boolean;
  message?: string;
};

export type LLMResponse = {
  ok: boolean;
  message?: string;
  toolCalls?: LLMToolCall[];
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
  errorCategory?: "missing_config" | "llm_request_failed" | "invalid_llm_response";
  missingEnv?: string[];
};

function getApiKeyPreview(value: string | undefined): string {
  if (!value) return "missing";
  if (value.length <= 8) return "configured";
  return `${value.slice(0, 3)}...${value.slice(-2)}`;
}

function sanitizeModelName(value: string | undefined): { model: string; valid: boolean } {
  const raw = value?.trim();
  if (!raw) {
    return { model: DEFAULT_OPENAI_MODEL, valid: false };
  }

  // Prevent accidental secret leakage when env is misconfigured.
  if (raw.startsWith("sk-") || raw.includes("sk-proj-") || raw.length > 80) {
    return { model: DEFAULT_OPENAI_MODEL, valid: false };
  }

  if (!/^[a-zA-Z0-9._:-]+$/.test(raw)) {
    return { model: DEFAULT_OPENAI_MODEL, valid: false };
  }

  return { model: raw, valid: true };
}

export function getOpenAIConfigStatus(): OpenAIConfigStatus {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const configuredModel = process.env.OPENAI_MODEL?.trim();
  const sanitizedModel = sanitizeModelName(configuredModel);
  const model = sanitizedModel.model;

  const missingEnv: string[] = [];
  if (!apiKey) missingEnv.push("OPENAI_API_KEY");
  if (!configuredModel || !sanitizedModel.valid) missingEnv.push("OPENAI_MODEL");

  if (missingEnv.length > 0) {
    return {
      ok: false,
      missingEnv,
      model,
      usedFallbackModel: !sanitizedModel.valid,
      message: `Configuracao OpenAI incompleta. Faltando: ${missingEnv.join(", ")}.`,
    };
  }

  return {
    ok: true,
    missingEnv,
    model,
    usedFallbackModel: false,
  };
}

export async function generateOpenAIResponse(input: {
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
  modelOverride?: string | null;
  temperature?: number | null;
}): Promise<LLMResponse> {
  const config = getOpenAIConfigStatus();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!config.ok || !apiKey) {
    return {
      ok: false,
      error: config.message || "Configuracao OpenAI incompleta.",
      errorCategory: "missing_config",
      missingEnv: config.missingEnv,
    };
  }

  const toolPayload = (input.tools || []).map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));

  const messagePayload = input.messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "tool",
        content: message.content,
        tool_call_id: message.toolCallId,
      };
    }

    if (message.role === "assistant" && message.toolCalls && message.toolCalls.length > 0) {
      return {
        role: "assistant",
        content: message.content || "",
        tool_calls: message.toolCalls.map((call) => ({
          id: call.id,
          type: "function",
          function: {
            name: call.name,
            arguments: call.arguments,
          },
        })),
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });

  try {
    const override = sanitizeModelName(input.modelOverride || undefined);
    const model = input.modelOverride && override.valid ? override.model : config.model;
    const temperature =
      typeof input.temperature === "number" && Number.isFinite(input.temperature)
        ? input.temperature
        : 0.2;

    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: messagePayload,
        tools: toolPayload.length > 0 ? toolPayload : undefined,
        tool_choice: toolPayload.length > 0 ? "auto" : undefined,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const bodyText = await response.text();
      return {
        ok: false,
        error: `Falha na chamada OpenAI (${response.status}).`,
        errorCategory: "llm_request_failed",
        missingEnv: [],
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            id?: string;
            function?: {
              name?: string;
              arguments?: string;
            };
          }>;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const firstMessage = payload.choices?.[0]?.message;
    if (!firstMessage) {
      return {
        ok: false,
        error: "Resposta da OpenAI sem mensagem valida.",
        errorCategory: "invalid_llm_response",
      };
    }

    const toolCalls = (firstMessage.tool_calls || [])
      .map((call) => ({
        id: call.id || "",
        name: call.function?.name || "",
        arguments: call.function?.arguments || "{}",
      }))
      .filter((call) => call.id && call.name);

    return {
      ok: true,
      message: firstMessage.content || "",
      toolCalls,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
    };
  } catch {
    return {
      ok: false,
      error: `Falha de comunicacao com OpenAI. Chave: ${getApiKeyPreview(apiKey)}.`,
      errorCategory: "llm_request_failed",
    };
  }
}
