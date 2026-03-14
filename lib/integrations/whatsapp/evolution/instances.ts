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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
  if (upper.includes("PAIR")) return "CONNECTING";
  if (upper.includes("CONNECT")) return "CONNECTING";
  if (upper.includes("ERROR") || upper.includes("FAIL")) return "ERROR";

  return "DISCONNECTED";
}

function normalizeQrValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image")) return trimmed;

  // Evolution sometimes returns pure base64 without data URI prefix.
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 100) {
    const compact = trimmed.replace(/\s+/g, "");
    return `data:image/png;base64,${compact}`;
  }

  return trimmed;
}

function pickNestedStrings(data: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const top = pickString(data[key]);
    if (top) return top;

    const nestedObj = asRecord(data[key]);
    const nested = pickString(
      nestedObj.value,
      nestedObj.code,
      nestedObj.pairingCode,
      nestedObj.base64,
      nestedObj.qrcode,
      nestedObj.qr,
    );
    if (nested) return nested;

    const nestedArr = asArray(data[key]);
    for (const item of nestedArr) {
      const row = asRecord(item);
      const found = pickString(
        row.value,
        row.code,
        row.pairingCode,
        row.base64,
        row.qrcode,
        row.qr,
      );
      if (found) return found;
    }
  }

  return null;
}

function getEvolutionPath(envKey: string, fallback: string): string {
  const envValue = process.env[envKey]?.trim();
  return envValue && envValue.length > 0 ? envValue : fallback;
}

function parseQrCodeResult(raw: unknown): WhatsAppQrCodeResult {
  const data = asRecord(raw);
  const nested = asRecord(data.instance || data.data || data.result);

  const qrCodeRaw = pickString(
    data.qrcode,
    data.base64,
    data.qr,
    data.qrCode,
    nested.qrcode,
    nested.base64,
    nested.qr,
    nested.qrCode,
    pickNestedStrings(data, ["qrcode", "qr", "base64", "code", "pairingCode", "pairing"]),
    pickNestedStrings(nested, ["qrcode", "qr", "base64", "code", "pairingCode", "pairing"]),
  );

  const pairingCode = pickString(
    data.pairingCode,
    data.code,
    nested.pairingCode,
    nested.code,
    pickNestedStrings(data, ["pairingCode", "pairing", "code"]),
    pickNestedStrings(nested, ["pairingCode", "pairing", "code"]),
  );

  const qrCode = normalizeQrValue(qrCodeRaw);

  const phoneNumber = pickString(
    data.phone,
    data.number,
    nested.phone,
    nested.number,
    nested.phoneNumber,
  );

  const status = normalizeInstanceStatus(
    data.status ||
      data.state ||
      data.connectionStatus ||
      nested.status ||
      nested.state ||
      nested.connectionStatus,
  );

  return {
    status,
    qrCode,
    pairingCode,
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
      webhook: input.webhookUrl
        ? {
            url: input.webhookUrl,
            enabled: true,
          }
        : undefined,
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

  const attempts: Array<{ method: "GET" | "POST"; path: string }> = [
    { method: "GET", path },
    { method: "POST", path },
    {
      method: "GET",
      path: `/instance/qrcode/${externalInstanceId}`,
    },
    {
      method: "GET",
      path: `/instance/qr/${externalInstanceId}`,
    },
  ];

  let lastRaw: unknown = null;
  for (const attempt of attempts) {
    try {
      const raw = await evolutionRequest({
        method: attempt.method,
        path: attempt.path,
      });
      lastRaw = raw;
      const parsed = parseQrCodeResult(raw);
      if (parsed.qrCode || parsed.pairingCode || parsed.status === "QRCODE") {
        return parsed;
      }
    } catch {
      // Try next endpoint/method shape for compatibility across Evolution versions.
    }
  }

  return parseQrCodeResult(lastRaw);
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
