import type {
  AgentActionResult,
  AgentContext,
  AgentExecutionResult,
  AgentRouteResult,
} from "@/lib/ai/types";
import { adsAgentPrompt } from "./prompt";
import { adsTools } from "./tools";
import { getAdsAgentRuntimeSettings } from "./config-store";
import {
  generateOpenAIResponse,
  getOpenAIConfigStatus,
  type LLMMessage,
  type LLMToolCall,
} from "@/lib/llm/openai";

type ResolvedAccount = {
  accountId: string;
  accountName?: string;
  source:
    | "explicit_account_id"
    | "account_name"
    | "client_binding"
    | "default_db"
    | "env_fallback";
};

type ExecutedTool = {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
};

function parseToolArguments(rawArguments: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(rawArguments || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore parse errors and fallback to empty args.
  }

  return {};
}

function buildConfigMissingMessage(missingEnv: string[]): string {
  return [
    "Configuracao da LLM incompleta para o Ads Agent.",
    `Variaveis faltando: ${missingEnv.join(", ")}.`,
    "Defina OPENAI_API_KEY e OPENAI_MODEL com valores validos.",
  ].join(" ");
}

function extractResolvedAccount(data: unknown): ResolvedAccount | undefined {
  const asAny = data as {
    resolvedAccount?: ResolvedAccount;
    account?: { resolvedAccount?: ResolvedAccount };
  };

  return asAny.account?.resolvedAccount || asAny.resolvedAccount;
}

function mergeParamsWithContext(
  rawArgs: Record<string, unknown>,
  context: AgentContext,
  thresholds: Record<string, number | undefined>,
  toolName?: string,
): Record<string, unknown> {
  const enriched = {
    ...rawArgs,
    clientId:
      typeof rawArgs.clientId === "string"
        ? rawArgs.clientId
        : context.clientId,
    accountId:
      typeof rawArgs.accountId === "string"
        ? rawArgs.accountId
        : typeof context.metadata?.accountId === "string"
          ? context.metadata.accountId
          : undefined,
    datePreset:
      typeof rawArgs.datePreset === "string"
        ? rawArgs.datePreset
        : "last_7d",
    limit:
      typeof rawArgs.limit === "number"
        ? rawArgs.limit
        : 25,
  };

  if (
    toolName === "analyzeMetaAccount" ||
    toolName === "generateMetaPerformanceSummary" ||
    toolName === "listMetaPerformanceAlerts"
  ) {
    return {
      ...enriched,
      thresholds: {
        ctrLowThreshold: thresholds.ctrLowThreshold,
        cpcHighThreshold: thresholds.cpcHighThreshold,
        spendNoResultThreshold: thresholds.spendNoResultThreshold,
        minSpendForEvaluation: thresholds.minSpendForEvaluation,
        minImpressionsForEvaluation: thresholds.minImpressionsForEvaluation,
      },
    };
  }

  return {
    ...enriched,
  };
}

function toLLMToolCalls(toolCalls: LLMToolCall[]): LLMMessage["toolCalls"] {
  return toolCalls.map((toolCall) => ({
    id: toolCall.id,
    name: toolCall.name,
    arguments: toolCall.arguments,
  }));
}

export async function runAdsAgent(
  context: AgentContext,
  route: AgentRouteResult,
): Promise<AgentExecutionResult> {
  let runtimeSettings: Awaited<ReturnType<typeof getAdsAgentRuntimeSettings>> | null = null;
  try {
    runtimeSettings = await getAdsAgentRuntimeSettings();
  } catch {
    runtimeSettings = null;
  }

  const activeTools = runtimeSettings
    ? adsTools.filter((tool) => runtimeSettings.enabledToolNames.has(tool.name))
    : adsTools;

  const runtimePrompt = runtimeSettings
    ? [
        runtimeSettings.systemPrompt,
        runtimeSettings.strategicContext
          ? `\nContexto estrategico:\n${runtimeSettings.strategicContext}`
          : "",
        `\nModo de execucao atual: ${runtimeSettings.executionMode}.`,
      ]
        .filter(Boolean)
        .join("\n")
    : adsAgentPrompt;

  if (runtimeSettings && !runtimeSettings.isActive) {
    return {
      agent: "ads",
      message:
        "Ads Agent esta inativo na configuracao atual. Ative o agente em /configuracoes/agentes para continuar.",
      toolsAvailable: activeTools.map((tool) => tool.name),
      route,
      accountUsed: null,
      toolsUsed: [],
      data: {
        stage: "agent-inactive",
      },
    };
  }

  if (activeTools.length === 0) {
    return {
      agent: "ads",
      message:
        "Nenhuma tool do Ads Agent esta habilitada. Ative ao menos uma tool em /configuracoes/agentes.",
      toolsAvailable: [],
      route,
      accountUsed: null,
      toolsUsed: [],
      data: {
        stage: "tools-disabled",
      },
    };
  }

  const openaiConfig = getOpenAIConfigStatus();

  if (!openaiConfig.ok) {
    return {
      agent: "ads",
      message: buildConfigMissingMessage(openaiConfig.missingEnv),
      toolsAvailable: activeTools.map((tool) => tool.name),
      route,
      accountUsed: null,
      toolsUsed: [],
      data: {
        stage: "llm-config-missing",
        missingEnv: openaiConfig.missingEnv,
        fallbackModel: openaiConfig.model,
        accountUsed: null,
        toolsUsed: [],
      },
    };
  }

  const llmMessages: LLMMessage[] = [
    {
      role: "system",
      content: runtimePrompt,
    },
    {
      role: "user",
      content: context.message,
    },
  ];

  const toolsUsed: ExecutedTool[] = [];
  const toolResultByName = new Map<string, AgentActionResult>();
  let accountUsed: ResolvedAccount | null = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const llmResult = await generateOpenAIResponse({
      messages: llmMessages,
      tools: activeTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
      modelOverride: runtimeSettings?.modelName,
      temperature: runtimeSettings?.temperature,
    });

    if (!llmResult.ok) {
      return {
        agent: "ads",
        message: llmResult.error || "Falha ao executar resposta com LLM.",
        toolsAvailable: activeTools.map((tool) => tool.name),
        route,
        accountUsed,
        toolsUsed,
        data: {
          stage: "llm-error",
          errorCategory: llmResult.errorCategory,
          missingEnv: llmResult.missingEnv,
          accountUsed,
          toolsUsed,
        },
      };
    }

    const toolCalls = llmResult.toolCalls || [];

    if (toolCalls.length === 0) {
      const finalMessage = llmResult.message?.trim() || "Nao foi possivel gerar resposta final.";

      return {
        agent: "ads",
        message: finalMessage,
        toolsAvailable: activeTools.map((tool) => tool.name),
        route,
        accountUsed,
        toolsUsed,
        data: {
          stage: "llm-final",
          accountUsed,
          toolsUsed,
          usage: llmResult.usage,
          toolResults: Array.from(toolResultByName.entries()).map(([name, result]) => ({
            name,
            ok: result.ok,
          })),
        },
      };
    }

    llmMessages.push({
      role: "assistant",
      content: llmResult.message || "",
      toolCalls: toLLMToolCalls(toolCalls),
    });

    for (const toolCall of toolCalls) {
      const tool = activeTools.find((entry) => entry.name === toolCall.name);

      if (!tool) {
        const errorResult: AgentActionResult = {
          ok: false,
          error: `Tool desconhecida solicitada pela LLM: ${toolCall.name}`,
          errorCategory: "tool_not_found",
        };

        llmMessages.push({
          role: "tool",
          toolCallId: toolCall.id,
          content: JSON.stringify(errorResult),
        });
        toolResultByName.set(toolCall.name, errorResult);
        toolsUsed.push({ tool: toolCall.name, args: {}, ok: false });
        continue;
      }

      const parsedArgs = parseToolArguments(toolCall.arguments);
      const finalArgs = mergeParamsWithContext(
        parsedArgs,
        context,
        {
          ctrLowThreshold: runtimeSettings?.thresholds.ctrLowThreshold,
          cpcHighThreshold: runtimeSettings?.thresholds.cpcHighThreshold,
          spendNoResultThreshold: runtimeSettings?.thresholds.spendNoResultThreshold,
          minSpendForEvaluation: runtimeSettings?.thresholds.minSpendForEvaluation,
          minImpressionsForEvaluation: runtimeSettings?.thresholds.minImpressionsForEvaluation,
        },
        tool.name,
      );
      const result = await tool.execute(finalArgs, context);

      const resolvedAccount = extractResolvedAccount(result.data);
      if (resolvedAccount) {
        accountUsed = resolvedAccount;
      }

      toolsUsed.push({
        tool: tool.name,
        args: finalArgs,
        ok: result.ok,
      });
      toolResultByName.set(tool.name, result);

      llmMessages.push({
        role: "tool",
        toolCallId: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    agent: "ads",
    message:
      "Limite de iteracoes com tools atingido. Reformule a pergunta ou especifique a conta e periodo.",
    toolsAvailable: activeTools.map((tool) => tool.name),
    route,
    accountUsed,
    toolsUsed,
    data: {
      stage: "llm-max-iterations",
      accountUsed,
      toolsUsed,
    },
  };
}
