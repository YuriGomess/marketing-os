import type {
  WhatsAppCreateInstanceInput,
  WhatsAppCreateInstanceResult,
  WhatsAppInstanceState,
  WhatsAppQrCodeResult,
} from "@/lib/integrations/whatsapp/types";
import { evolutionRequest } from "@/lib/integrations/whatsapp/evolution/client";

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

function normalizeInstanceStatus(value: unknown): WhatsAppInstanceState {
  if (typeof value !== "string") {
    return "DISCONNECTED";
  }

  const upper = value.toUpperCase();
  if (upper.includes("OPEN") || upper.includes("CONNECTED")) return "CONNECTED";
  if (upper.includes("QRCODE") || upper.includes("QR")) return "QRCODE";
  if (upper.includes("CONNECT")) return "CONNECTING";
  if (upper.includes("ERROR") || upper.includes("FAIL")) return "ERROR";

  return "DISCONNECTED";
}

function getEvolutionPath(envKey: string, fallback: string): string {
  const envValue = process.env[envKey]?.trim();
  return envValue && envValue.length > 0 ? envValue : fallback;
}

function parseQrCodeResult(raw: unknown): WhatsAppQrCodeResult {
  const data = asRecord(raw);
  const nested = asRecord(data.instance || data.data || data.result);

  const qrCode = pickString(
    data.qrcode,
    data.base64,
    data.qr,
    nested.qrcode,
    nested.base64,
    nested.qr,
  );

  const phoneNumber = pickString(
    data.phone,
    data.number,
    nested.phone,
    nested.number,
    nested.phoneNumber,
  );

  const status = normalizeInstanceStatus(
    data.status || data.state || nested.status || nested.state,
  );

  return {
    status,
    qrCode,
    phoneNumber,
    raw,
  };
}

export async function createEvolutionInstance(
  input: WhatsAppCreateInstanceInput,
): Promise<WhatsAppCreateInstanceResult> {
  const path = getEvolutionPath("EVOLUTION_PATH_CREATE_INSTANCE", "/instance/create");

  const raw = await evolutionRequest({
    method: "POST",
    path,
    body: {
      instanceName: input.name,
      qrcode: true,
      webhook: input.webhookUrl || undefined,
      integration: "WHATSAPP-BAILEYS",
    },
  });

  const parsed = parseQrCodeResult(raw);
  const top = asRecord(raw);
  const nested = asRecord(top.instance || top.data || top.result);

  return {
    externalInstanceId:
      pickString(top.instanceName, top.instanceId, nested.instanceName, nested.id) ||
      input.name,
    status: parsed.status,
    qrCode: parsed.qrCode,
    phoneNumber: parsed.phoneNumber,
    webhookUrl: input.webhookUrl || pickString(top.webhook, nested.webhook),
    raw,
  };
}

export async function fetchEvolutionQrCode(
  externalInstanceId: string,
): Promise<WhatsAppQrCodeResult> {
  const pathTemplate = getEvolutionPath(
    "EVOLUTION_PATH_GET_QRCODE",
    "/instance/connect/{instanceId}",
  );
  const path = pathTemplate.replace("{instanceId}", externalInstanceId);

  const raw = await evolutionRequest({
    method: "GET",
    path,
  });

  return parseQrCodeResult(raw);
}

export async function getEvolutionInstanceStatus(
  externalInstanceId: string,
): Promise<WhatsAppQrCodeResult> {
  const pathTemplate = getEvolutionPath(
    "EVOLUTION_PATH_GET_STATUS",
    "/instance/connectionState/{instanceId}",
  );
  const path = pathTemplate.replace("{instanceId}", externalInstanceId);

  const raw = await evolutionRequest({
    method: "GET",
    path,
  });

  return parseQrCodeResult(raw);
}
