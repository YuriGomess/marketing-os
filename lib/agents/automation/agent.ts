import {
  buildAutomationPreview,
  type AutomationDraft,
  validateAutomationDraft,
} from "@/lib/automations/draft";
import { automationAgentPrompt } from "@/lib/agents/automation/prompt";
import { automationAgentTools } from "@/lib/agents/automation/tools";
import {
  generateOpenAIResponse,
  getOpenAIConfigStatus,
  type LLMMessage,
} from "@/lib/llm/openai";

function parseJsonObject(input: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function extractJsonFromMessage(input: string): Record<string, unknown> | null {
  const direct = parseJsonObject(input);
  if (direct) return direct;

  const codeBlockMatch = input.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    return parseJsonObject(codeBlockMatch[1]);
  }

  return null;
}

export type AutomationAgentDraftResult = {
  ok: boolean;
  draft?: AutomationDraft;
  preview?: ReturnType<typeof buildAutomationPreview>;
  issues?: string[];
  needsClarification?: boolean;
  ambiguities?: string[];
  assumptions?: string[];
  llmUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
};

export async function generateAutomationDraftFromNaturalLanguage(input: {
  request: string;
  context?: Record<string, unknown>;
}): Promise<AutomationAgentDraftResult> {
  const userRequest = input.request.trim();
  if (!userRequest) {
    return {
      ok: false,
      error: "Descreva o que a automacao deve fazer.",
    };
  }

  const openaiConfig = getOpenAIConfigStatus();
  if (!openaiConfig.ok) {
    return {
      ok: false,
      error: `Configuracao da LLM incompleta: ${openaiConfig.missingEnv.join(", ")}`,
    };
  }

  const llmMessages: LLMMessage[] = [
    {
      role: "system",
      content: automationAgentPrompt,
    },
    {
      role: "user",
      content: [
        "Converta o pedido abaixo em draft estruturado para automacao.",
        `Pedido: ${userRequest}`,
        input.context
          ? `Contexto adicional: ${JSON.stringify(input.context)}`
          : "",
        "Responda com tool call generate_automation_draft.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const llm = await generateOpenAIResponse({
    messages: llmMessages,
    tools: automationAgentTools,
    temperature: 0.1,
  });

  if (!llm.ok) {
    return {
      ok: false,
      error: llm.error || "Falha ao gerar draft com LLM.",
    };
  }

  let toolPayload: Record<string, unknown> | null = null;
  let ambiguities: string[] = [];
  let assumptions: string[] = [];

  const firstToolCall = llm.toolCalls?.[0];
  if (firstToolCall?.name === "generate_automation_draft") {
    const parsed = parseJsonObject(firstToolCall.arguments);
    if (parsed) {
      toolPayload = parsed;
      if (Array.isArray(parsed.ambiguities)) {
        ambiguities = parsed.ambiguities.filter(
          (item): item is string => typeof item === "string",
        );
      }
      if (Array.isArray(parsed.assumptions)) {
        assumptions = parsed.assumptions.filter(
          (item): item is string => typeof item === "string",
        );
      }
    }
  }

  if (!toolPayload) {
    const parsedMessage = extractJsonFromMessage(llm.message || "");
    toolPayload = parsedMessage;
  }

  if (!toolPayload) {
    return {
      ok: false,
      error:
        "A IA nao retornou draft estruturado. Reformule o pedido com mais detalhes.",
      llmUsage: llm.usage,
    };
  }

  const candidateDraft =
    toolPayload.draft && typeof toolPayload.draft === "object"
      ? toolPayload.draft
      : toolPayload;

  const validated = validateAutomationDraft(candidateDraft);
  const allIssues = [...validated.issues];

  if (ambiguities.length > 0) {
    allIssues.push(...ambiguities.map((item) => `Ambiguidade: ${item}`));
  }

  const preview = buildAutomationPreview(validated.draft, {
    ambiguities,
  });

  return {
    ok: true,
    draft: validated.draft,
    preview,
    issues: allIssues,
    needsClarification: ambiguities.length > 0 || !validated.ok,
    ambiguities,
    assumptions,
    llmUsage: llm.usage,
  };
}
