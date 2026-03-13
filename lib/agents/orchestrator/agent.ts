import type {
  AgentContext,
  AgentRouteResult,
} from "@/lib/ai/types";
import type {
  AgentName,
  OrchestrationEntities,
  OrchestratorDecision,
  ResponseMode,
} from "@/lib/ai/orchestration-types";
import { generateOpenAIResponse, getOpenAIConfigStatus } from "@/lib/llm/openai";
import { orchestratorPrompt } from "@/lib/agents/orchestrator/prompt";
import { orchestratorTools } from "@/lib/agents/orchestrator/tools";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function inferMode(message: string): ResponseMode {
  const normalized = normalize(message);

  if (/(criar automacao|crie uma automacao|automacao|automacoes|cron|todo dia|agendar)/.test(normalized)) {
    return "automation_draft";
  }

  if (/(relatorio|resumo|report|formatado|lista em topicos)/.test(normalized)) {
    return "report";
  }

  if (/(execute|executar|aplique|rodar|confirmar|ativar|pausar|excluir)/.test(normalized)) {
    return "execution";
  }

  if (normalized.length < 8) {
    return "generic";
  }

  return "analysis";
}

function inferAgent(message: string): { selectedAgent: AgentName; matchedTerms: string[]; reason: string } {
  const normalized = normalize(message);

  const automationTerms = ["automacao", "automacoes", "cron", "agendar", "regra", "workflow"];
  const whatsappTerms = ["whatsapp", "inbox", "conversa", "mensagem", "cliente sem resposta"];
  const adsTerms = ["meta", "ads", "campanha", "anuncio", "conta", "roas", "ctr", "cpa", "insights", "relatorio"];

  const matchedAutomation = automationTerms.filter((term) => normalized.includes(term));
  const matchedWhatsapp = whatsappTerms.filter((term) => normalized.includes(term));
  const matchedAds = adsTerms.filter((term) => normalized.includes(term));

  if (matchedAutomation.length > 0) {
    return {
      selectedAgent: "automation",
      matchedTerms: matchedAutomation,
      reason: "Solicitacao menciona criacao/gestao de automacoes.",
    };
  }

  if (matchedWhatsapp.length > 0) {
    return {
      selectedAgent: "whatsapp",
      matchedTerms: matchedWhatsapp,
      reason: "Solicitacao relacionada a inbox/mensagens WhatsApp.",
    };
  }

  if (matchedAds.length > 0) {
    return {
      selectedAgent: "ads",
      matchedTerms: matchedAds,
      reason: "Solicitacao relacionada a contas/campanhas/performance de Ads.",
    };
  }

  return {
    selectedAgent: "ads",
    matchedTerms: [],
    reason: "Fallback seguro para Ads enquanto dominio nao esta explicito.",
  };
}

function extractEntities(message: string): OrchestrationEntities {
  const normalized = normalize(message);
  const entities: OrchestrationEntities = {};

  const accountNameMatch = message.match(/conta\s+([a-zA-Z0-9\s_-]+)/i);
  if (accountNameMatch?.[1]) {
    entities.accountName = accountNameMatch[1].trim();
  }

  const accountIdMatch = message.match(/act_\d+/i);
  if (accountIdMatch?.[0]) {
    entities.accountId = accountIdMatch[0];
  }

  if (normalized.includes("meta")) {
    entities.provider = "META_ADS";
  }

  if (/(7 dias|ultimos 7|last_7d)/.test(normalized)) {
    entities.period = "last_7d";
  } else if (/(30 dias|ultimos 30|last_30d)/.test(normalized)) {
    entities.period = "last_30d";
  }

  const timeMatch = message.match(/\b(\d{1,2})h\b/i);
  if (timeMatch?.[1]) {
    entities.triggerTime = `${timeMatch[1].padStart(2, "0")}:00`;
  }

  return entities;
}

function sanitizeDecision(input: Partial<OrchestratorDecision>, fallback: OrchestratorDecision): OrchestratorDecision {
  const selectedAgent: AgentName =
    input.selectedAgent === "ads" || input.selectedAgent === "automation" || input.selectedAgent === "whatsapp"
      ? input.selectedAgent
      : fallback.selectedAgent;

  const mode: ResponseMode =
    input.mode === "analysis" ||
    input.mode === "report" ||
    input.mode === "execution" ||
    input.mode === "automation_draft" ||
    input.mode === "generic"
      ? input.mode
      : fallback.mode;

  const confidence =
    typeof input.confidence === "number" && Number.isFinite(input.confidence)
      ? Math.max(0, Math.min(1, input.confidence))
      : fallback.confidence;

  return {
    selectedAgent,
    mode,
    confidence,
    reason: typeof input.reason === "string" && input.reason.trim() ? input.reason : fallback.reason,
    normalizedIntent:
      typeof input.normalizedIntent === "string" && input.normalizedIntent.trim()
        ? input.normalizedIntent
        : fallback.normalizedIntent,
    extractedEntities:
      input.extractedEntities && typeof input.extractedEntities === "object"
        ? (input.extractedEntities as OrchestrationEntities)
        : fallback.extractedEntities,
  };
}

export async function runOrchestratorAgent(context: AgentContext): Promise<AgentRouteResult> {
  const heuristic = inferAgent(context.message);
  const mode = inferMode(context.message);
  const entities = extractEntities(context.message);

  const fallbackDecision: OrchestratorDecision = {
    selectedAgent: heuristic.selectedAgent,
    mode,
    confidence: heuristic.matchedTerms.length > 0 ? 0.86 : 0.45,
    reason: heuristic.reason,
    normalizedIntent: normalize(context.message),
    extractedEntities: entities,
  };

  let decision = fallbackDecision;

  const llmConfig = getOpenAIConfigStatus();
  if (llmConfig.ok) {
    const llm = await generateOpenAIResponse({
      messages: [
        { role: "system", content: orchestratorPrompt },
        {
          role: "user",
          content: [
            `Mensagem do usuario: ${context.message}`,
            context.clientId ? `clientId: ${context.clientId}` : "",
            context.conversationId ? `conversationId: ${context.conversationId}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      tools: orchestratorTools,
      temperature: 0,
    });

    const call = llm.toolCalls?.[0];
    if (llm.ok && call?.name === "route_request") {
      try {
        const parsed = JSON.parse(call.arguments || "{}") as Partial<OrchestratorDecision>;
        decision = sanitizeDecision(parsed, fallbackDecision);
      } catch {
        decision = fallbackDecision;
      }
    }
  }

  return {
    agent: decision.selectedAgent,
    selectedAgent: decision.selectedAgent,
    mode: decision.mode,
    confidence: decision.confidence,
    reason: decision.reason,
    normalizedIntent: decision.normalizedIntent,
    extractedEntities: decision.extractedEntities,
    matchedTerms: heuristic.matchedTerms,
  };
}
