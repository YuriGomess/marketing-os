import { runAdsAgent } from "@/lib/agents/ads/agent";
import { runWhatsappAgent } from "@/lib/agents/whatsapp/agent";
import { runOrchestratorAgent } from "@/lib/agents/orchestrator/agent";
import { generateAutomationDraftFromNaturalLanguage } from "@/lib/agents/automation/agent";
import type { OrchestratorDecision } from "@/lib/ai/orchestration-types";
import type { AgentContext, AgentExecutionResult, AgentRouteResult } from "./types";

function toDecision(route: AgentRouteResult): OrchestratorDecision {
  return {
    selectedAgent: route.selectedAgent,
    mode: route.mode,
    confidence: route.confidence,
    reason: route.reason,
    normalizedIntent: route.normalizedIntent,
    extractedEntities: route.extractedEntities,
  };
}

export async function processAgentMessage(
  context: AgentContext,
): Promise<AgentExecutionResult> {
  const route = await runOrchestratorAgent(context);
  const orchestrator = toDecision(route);

  if (route.selectedAgent === "automation") {
    const draft = await generateAutomationDraftFromNaturalLanguage({
      request: context.message,
      context: {
        clientId: context.clientId,
        conversationId: context.conversationId,
        metadata: context.metadata,
        entities: route.extractedEntities,
      },
    });

    if (!draft.ok) {
      return {
        agent: "automation",
        mode: route.mode,
        message: draft.error || "Nao foi possivel gerar draft da automacao.",
        toolsAvailable: ["generate_automation_draft"],
        orchestrator,
        route,
        accountUsed: null,
        toolsUsed: [],
        data: {
          stage: "automation-draft-error",
          issues: draft.issues || [],
        },
        error: draft.error || "automation_draft_error",
      };
    }

    const previewText = draft.preview
      ? [
          "",
          "Preview:",
          `- Titulo: ${draft.preview.title}`,
          `- Resumo: ${draft.preview.summary}`,
          `- Provider: ${draft.preview.sections.provider}`,
          `- Agenda: ${draft.preview.sections.schedule}`,
        ].join("\n")
      : "";

    return {
      agent: "automation",
      mode: route.mode,
      message: [
        "Draft de automacao gerado com sucesso.",
        draft.needsClarification
          ? "Antes de executar, revise as ambiguidades apontadas."
          : "Draft pronto para revisao e execucao.",
      ].join(" ") + previewText,
      toolsAvailable: ["generate_automation_draft"],
      orchestrator,
      route,
      accountUsed: null,
      toolsUsed: [
        {
          tool: "generate_automation_draft",
          ok: true,
          args: {
            mode: route.mode,
          },
        },
      ],
      data: {
        stage: "automation-draft-success",
        draft: draft.draft,
        preview: draft.preview,
        issues: draft.issues || [],
        ambiguities: draft.ambiguities || [],
        assumptions: draft.assumptions || [],
      },
      error: null,
    };
  }

  if (route.selectedAgent === "whatsapp") {
    return runWhatsappAgent({
      message: context.message,
      route,
      orchestrator,
    });
  }

  if (route.selectedAgent === "ads") {
    return runAdsAgent(
      {
        ...context,
        metadata: {
          ...(context.metadata || {}),
          ...(route.extractedEntities || {}),
        },
      },
      route,
    );
  }

  return {
    agent: "ads",
    mode: route.mode,
    message: "Roteamento aplicado com fallback para o agente de Ads.",
    toolsAvailable: [],
    orchestrator,
    route,
    accountUsed: null,
    toolsUsed: [],
    data: {
      stage: "orchestrator-fallback",
    },
    error: null,
  };
}
