import { runAdsAgent } from "@/lib/agents/ads/agent";
import { routeAgent } from "./router";
import type { AgentContext, AgentExecutionResult } from "./types";

export async function processAgentMessage(
  context: AgentContext,
): Promise<AgentExecutionResult> {
  const route = routeAgent(context.message);

  if (route.agent === "ads") {
    return runAdsAgent(context, route);
  }

  return {
    agent: "ads",
    message: "Roteamento aplicado com fallback para o agente de Ads.",
    toolsAvailable: [],
    route,
  };
}
