import type { LLMToolDefinition } from "@/lib/llm/openai";

export const orchestratorTools: LLMToolDefinition[] = [
  {
    name: "route_request",
    description: "Define agente alvo, modo de resposta e entidades extraidas da solicitacao.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["selectedAgent", "mode", "confidence", "reason", "normalizedIntent"],
      properties: {
        selectedAgent: {
          type: "string",
          enum: ["ads", "automation", "whatsapp"],
        },
        mode: {
          type: "string",
          enum: ["analysis", "report", "execution", "automation_draft", "generic"],
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
        },
        reason: { type: "string" },
        normalizedIntent: { type: "string" },
        extractedEntities: {
          type: "object",
          additionalProperties: {
            type: ["string", "number", "boolean", "null"],
          },
        },
      },
    },
  },
];
