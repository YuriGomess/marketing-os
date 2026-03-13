export type AgentName = "ads" | "automation" | "whatsapp";

export type ResponseMode =
  | "analysis"
  | "report"
  | "execution"
  | "automation_draft"
  | "generic";

export type OrchestrationEntities = {
  accountName?: string;
  accountId?: string;
  provider?: string;
  period?: string;
  triggerTime?: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type OrchestratorDecision = {
  selectedAgent: AgentName;
  mode: ResponseMode;
  confidence: number;
  reason: string;
  normalizedIntent: string;
  extractedEntities: OrchestrationEntities;
};
