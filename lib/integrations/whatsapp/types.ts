export type WhatsAppProviderName = "evolution";

export type WhatsAppProviderConfigStatus = {
  ok: boolean;
  provider: WhatsAppProviderName;
  missingEnv: string[];
  message?: string;
};

export type WhatsAppInstanceState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "QRCODE"
  | "CONNECTED"
  | "ERROR";

export type WhatsAppMessageDirection = "INBOUND" | "OUTBOUND";

export type WhatsAppMessageKind =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "AUDIO"
  | "DOCUMENT"
  | "STICKER"
  | "LOCATION"
  | "CONTACT"
  | "UNKNOWN";

export type WhatsAppCreateInstanceInput = {
  name: string;
  webhookUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type WhatsAppCreateInstanceResult = {
  externalInstanceId?: string | null;
  status: WhatsAppInstanceState;
  qrCode?: string | null;
  pairingCode?: string | null;
  phoneNumber?: string | null;
  webhookUrl?: string | null;
  raw?: unknown;
};

export type WhatsAppQrCodeResult = {
  status: WhatsAppInstanceState;
  qrCode?: string | null;
  pairingCode?: string | null;
  phoneNumber?: string | null;
  raw?: unknown;
};

export type WhatsAppSendMessageInput = {
  instanceExternalId: string;
  to: string;
  text: string;
};

export type WhatsAppSendMessageResult = {
  externalMessageId?: string | null;
  sentAt?: string | null;
  raw?: unknown;
};

export type NormalizedWhatsappWebhookEvent = {
  eventType: string;
  externalInstanceId?: string | null;
  externalContactId?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  externalConversationId?: string | null;
  externalMessageId?: string | null;
  direction?: WhatsAppMessageDirection;
  messageType?: WhatsAppMessageKind;
  textContent?: string | null;
  mediaUrl?: string | null;
  timestamp?: string | null;
  rawPayload: Record<string, unknown>;
};

export interface WhatsAppProvider {
  readonly name: WhatsAppProviderName;
  getConfigStatus(): WhatsAppProviderConfigStatus;
  createInstance(input: WhatsAppCreateInstanceInput): Promise<WhatsAppCreateInstanceResult>;
  fetchQrCode(instanceExternalId: string): Promise<WhatsAppQrCodeResult>;
  getInstanceStatus(instanceExternalId: string): Promise<WhatsAppQrCodeResult>;
  sendMessage(input: WhatsAppSendMessageInput): Promise<WhatsAppSendMessageResult>;
  normalizeWebhookEvent(payload: unknown): NormalizedWhatsappWebhookEvent | null;
}
