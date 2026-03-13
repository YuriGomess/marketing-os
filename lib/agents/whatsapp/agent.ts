import type { AgentExecutionResult, AgentRouteResult } from "@/lib/ai/types";
import { whatsappAgentPrompt } from "@/lib/agents/whatsapp/prompt";
import { whatsappTools } from "@/lib/agents/whatsapp/tools";

export async function runWhatsappAgent(input: {
  message: string;
  route: AgentRouteResult;
}): Promise<AgentExecutionResult> {
  return {
    agent: "ads",
    message: [
      "Base do WhatsApp Agent criada.",
      "Nesta etapa ele ainda nao executa fluxo completo.",
      `Prompt base carregado (${whatsappAgentPrompt.trim().slice(0, 36)}...).`,
      `Tools registradas: ${whatsappTools.map((tool) => tool.name).join(", ")}.`,
    ].join(" "),
    toolsAvailable: whatsappTools.map((tool) => tool.name),
    route: input.route,
    accountUsed: null,
    toolsUsed: [],
    data: {
      stage: "whatsapp-agent-base",
    },
  };
}
