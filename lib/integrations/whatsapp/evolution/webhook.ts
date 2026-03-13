import type {
  NormalizedWhatsappWebhookEvent,
  WhatsAppMessageDirection,
  WhatsAppMessageKind,
} from "@/lib/integrations/whatsapp/types";

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

function normalizeDirection(value: unknown): WhatsAppMessageDirection {
  const parsed = typeof value === "string" ? value.toUpperCase() : "";
  if (parsed.includes("OUT") || parsed.includes("FROM_ME")) {
    return "OUTBOUND";
  }

  return "INBOUND";
}

function normalizeMessageType(value: unknown): WhatsAppMessageKind {
  const parsed = typeof value === "string" ? value.toUpperCase() : "UNKNOWN";
  if (parsed.includes("TEXT")) return "TEXT";
  if (parsed.includes("IMAGE")) return "IMAGE";
  if (parsed.includes("VIDEO")) return "VIDEO";
  if (parsed.includes("AUDIO")) return "AUDIO";
  if (parsed.includes("DOC")) return "DOCUMENT";
  if (parsed.includes("STICKER")) return "STICKER";
  if (parsed.includes("LOCATION")) return "LOCATION";
  if (parsed.includes("CONTACT")) return "CONTACT";

  return "UNKNOWN";
}

export function normalizeEvolutionWebhookEvent(
  payload: unknown,
): NormalizedWhatsappWebhookEvent | null {
  const root = asRecord(payload);
  if (Object.keys(root).length === 0) {
    return null;
  }

  const data = asRecord(root.data || root.message || root.body);
  const key = asRecord(data.key);
  const sender = asRecord(data.sender || data.contact);

  const messageText =
    pickString(
      data.text,
      asRecord(data.message).conversation,
      asRecord(data.message).text,
      asRecord(asRecord(data.message).extendedTextMessage).text,
      asRecord(data.content).text,
    ) || null;

  const mediaUrl = pickString(
    data.mediaUrl,
    asRecord(data.message).url,
    asRecord(data.content).mediaUrl,
  );

  return {
    eventType:
      pickString(root.event, root.type, root.eventType, data.type) ||
      "UNKNOWN_EVENT",
    externalInstanceId:
      pickString(root.instance, root.instanceName, root.instanceId, data.instance) ||
      null,
    externalContactId:
      pickString(
        sender.id,
        data.remoteJid,
        key.remoteJid,
        data.from,
        data.sender,
      ) || null,
    contactName: pickString(sender.name, data.pushName, data.senderName),
    contactPhone:
      pickString(data.phone, sender.phone, data.from, key.remoteJid) || null,
    externalConversationId:
      pickString(data.chatId, data.remoteJid, key.remoteJid, data.conversationId) ||
      null,
    externalMessageId:
      pickString(data.id, key.id, data.messageId) || null,
    direction: normalizeDirection(data.direction || data.fromMe || key.fromMe),
    messageType: normalizeMessageType(data.messageType || data.type),
    textContent: messageText,
    mediaUrl,
    timestamp:
      pickString(data.timestamp, data.messageTimestamp) ||
      new Date().toISOString(),
    rawPayload: root,
  };
}
