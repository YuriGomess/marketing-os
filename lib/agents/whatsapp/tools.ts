import type { AgentToolDefinition } from "@/lib/ai/types";

export const whatsappTools: AgentToolDefinition[] = [
  {
    name: "listWhatsappConversations",
    description: "Lista conversas da inbox WhatsApp para contexto do agente.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        instanceId: { type: "string" },
      },
    },
    execute: async () => ({
      ok: false,
      error: "Tool base do WhatsApp Agent ainda nao implementada nesta etapa.",
      errorCategory: "not_implemented",
    }),
  },
  {
    name: "sendWhatsappMessage",
    description: "Envia mensagem via inbox WhatsApp quando permitido.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["conversationId", "text"],
      properties: {
        conversationId: { type: "string" },
        text: { type: "string" },
      },
    },
    execute: async () => ({
      ok: false,
      error: "Envio via WhatsApp Agent sera habilitado na proxima etapa.",
      errorCategory: "not_implemented",
    }),
  },
];
