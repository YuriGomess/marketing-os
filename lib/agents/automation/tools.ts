import {
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_EXECUTION_MODES,
  AUTOMATION_OPERATORS,
  AUTOMATION_PROVIDERS,
  AUTOMATION_SCOPE_ENTITY_TYPES,
  AUTOMATION_TRIGGER_TYPES,
} from "@/lib/automations/draft";
import type { LLMToolDefinition } from "@/lib/llm/openai";

export const automationAgentTools: LLMToolDefinition[] = [
  {
    name: "generate_automation_draft",
    description:
      "Gera um draft estruturado de automacao com enums validos e lista de ambiguidades.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["draft"],
      properties: {
        draft: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "provider",
            "triggerType",
            "cronExpression",
            "executionMode",
            "isActive",
            "isDraft",
            "scopes",
            "rules",
            "actions",
          ],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            provider: { type: "string", enum: [...AUTOMATION_PROVIDERS] },
            triggerType: { type: "string", enum: [...AUTOMATION_TRIGGER_TYPES] },
            cronExpression: { type: "string" },
            executionMode: { type: "string", enum: [...AUTOMATION_EXECUTION_MODES] },
            isActive: { type: "boolean" },
            isDraft: { type: "boolean" },
            scopes: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["entityType", "entityId"],
                properties: {
                  entityType: {
                    type: "string",
                    enum: [...AUTOMATION_SCOPE_ENTITY_TYPES],
                  },
                  entityId: { type: "string" },
                  metadata: { type: "object", additionalProperties: true },
                },
              },
            },
            rules: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["metricKey", "operator", "value"],
                properties: {
                  metricKey: { type: "string" },
                  operator: { type: "string", enum: [...AUTOMATION_OPERATORS] },
                  value: { type: "number" },
                  metadata: { type: "object", additionalProperties: true },
                },
              },
            },
            actions: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["actionType"],
                properties: {
                  actionType: { type: "string", enum: [...AUTOMATION_ACTION_TYPES] },
                  sortOrder: { type: "number" },
                  payload: { type: "object", additionalProperties: true },
                },
              },
            },
            draftPayload: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
        ambiguities: {
          type: "array",
          items: { type: "string" },
        },
        assumptions: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
];
