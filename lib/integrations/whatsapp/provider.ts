import type {
  NormalizedWhatsappWebhookEvent,
  WhatsAppCreateInstanceInput,
  WhatsAppCreateInstanceResult,
  WhatsAppProvider,
  WhatsAppProviderConfigStatus,
  WhatsAppQrCodeResult,
  WhatsAppSendMessageInput,
  WhatsAppSendMessageResult,
} from "@/lib/integrations/whatsapp/types";
import { getEvolutionConfigStatus } from "@/lib/integrations/whatsapp/evolution/client";
import {
  createEvolutionInstance,
  fetchEvolutionQrCode,
  getEvolutionInstanceStatus,
} from "@/lib/integrations/whatsapp/evolution/instances";
import { sendEvolutionTextMessage } from "@/lib/integrations/whatsapp/evolution/messages";
import { normalizeEvolutionWebhookEvent } from "@/lib/integrations/whatsapp/evolution/webhook";

class EvolutionWhatsAppProvider implements WhatsAppProvider {
  readonly name = "evolution" as const;

  getConfigStatus(): WhatsAppProviderConfigStatus {
    const provider = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() || "evolution";
    const evolution = getEvolutionConfigStatus();
    const missing = [...evolution.missing];

    if (provider !== "evolution") {
      missing.unshift("WHATSAPP_PROVIDER=evolution");
    }

    return {
      ok: missing.length === 0,
      provider: "evolution",
      missingEnv: missing,
      message:
        missing.length > 0
          ? `Configuracao WhatsApp incompleta: ${missing.join(", ")}`
          : undefined,
    };
  }

  async createInstance(
    input: WhatsAppCreateInstanceInput,
  ): Promise<WhatsAppCreateInstanceResult> {
    return createEvolutionInstance(input);
  }

  async fetchQrCode(instanceExternalId: string): Promise<WhatsAppQrCodeResult> {
    return fetchEvolutionQrCode(instanceExternalId);
  }

  async getInstanceStatus(instanceExternalId: string): Promise<WhatsAppQrCodeResult> {
    return getEvolutionInstanceStatus(instanceExternalId);
  }

  async sendMessage(
    input: WhatsAppSendMessageInput,
  ): Promise<WhatsAppSendMessageResult> {
    return sendEvolutionTextMessage(input);
  }

  normalizeWebhookEvent(payload: unknown): NormalizedWhatsappWebhookEvent | null {
    return normalizeEvolutionWebhookEvent(payload);
  }
}

const evolutionProvider = new EvolutionWhatsAppProvider();

export function getWhatsAppProvider(): WhatsAppProvider {
  const selected = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() || "evolution";
  if (selected !== "evolution") {
    return evolutionProvider;
  }

  return evolutionProvider;
}

export function getWhatsAppProviderConfigStatus(): WhatsAppProviderConfigStatus {
  return getWhatsAppProvider().getConfigStatus();
}
