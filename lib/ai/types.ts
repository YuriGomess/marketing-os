import { IntegrationProvider } from "@prisma/client";
import type {
  AgentName,
  OrchestrationEntities,
  OrchestratorDecision,
  ResponseMode,
} from "@/lib/ai/orchestration-types";

export type AgentRouteResult = {
  agent: AgentName;
  selectedAgent: AgentName;
  mode: ResponseMode;
  confidence: number;
  reason: string;
  normalizedIntent: string;
  extractedEntities: OrchestrationEntities;
  matchedTerms: string[];
};

export type AgentContext = {
  message: string;
  conversationId?: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
};

export type AgentActionResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  errorCategory?: string;
  missingEnv?: string[];
  foundEnv?: string[];
  details?: unknown;
};

export type AgentToolExecutor = (
  params: Record<string, unknown>,
  context: AgentContext,
) => Promise<AgentActionResult>;

export type AgentToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  action?: string;
  execute: AgentToolExecutor;
};

export type AgentExecutionResult = {
  agent: AgentName;
  mode: ResponseMode;
  message: string;
  toolsAvailable: string[];
  orchestrator: OrchestratorDecision;
  route: AgentRouteResult;
  accountUsed?: Record<string, unknown> | null;
  toolsUsed?: Array<Record<string, unknown>>;
  data?: Record<string, unknown>;
  error?: string | null;
};

// Compat layer for existing stubs still useful in this stage.
export type AIContext = Omit<AgentContext, "message">;

export type AIToolParams = Record<string, unknown>;

export type AIToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type AIToolDefinition = {
  name: string;
  description: string;
  provider?: IntegrationProvider | "INTERNAL";
  execute: (params: AIToolParams, context?: AIContext) => Promise<AIToolResult>;
};
