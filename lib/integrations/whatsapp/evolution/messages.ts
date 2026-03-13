import type { WhatsAppSendMessageInput, WhatsAppSendMessageResult } from "@/lib/integrations/whatsapp/types";
import { evolutionRequest } from "@/lib/integrations/whatsapp/evolution/client";

function getEvolutionPath(envKey: string, fallback: string): string {
  const envValue = process.env[envKey]?.trim();
  return envValue && envValue.length > 0 ? envValue : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export async function sendEvolutionTextMessage(
  input: WhatsAppSendMessageInput,
): Promise<WhatsAppSendMessageResult> {
  const pathTemplate = getEvolutionPath(
    "EVOLUTION_PATH_SEND_TEXT",
    "/message/sendText/{instanceId}",
  );
  const path = pathTemplate.replace("{instanceId}", input.instanceExternalId);

  const raw = await evolutionRequest({
    method: "POST",
    path,
    body: {
      number: input.to,
      text: input.text,
    },
  });

  const data = asRecord(raw);
  const nested = asRecord(data.data || data.result || data.message || data.key);

  return {
    externalMessageId: pickString(
      data.messageId,
      data.id,
      nested.id,
      nested.messageId,
      nested.key,
    ),
    sentAt: new Date().toISOString(),
    raw,
  };
}
