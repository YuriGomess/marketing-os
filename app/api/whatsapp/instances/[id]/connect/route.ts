import { getWhatsAppProvider, getWhatsAppProviderConfigStatus } from "@/lib/integrations/whatsapp/provider";
import {
  getWhatsappInstanceById,
  updateWhatsappInstanceConnection,
} from "@/lib/whatsapp/store";
import { mapProviderStateToInstanceStatus } from "@/lib/whatsapp/mappers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const instance = await getWhatsappInstanceById(id);

    if (!instance) {
      return Response.json(
        {
          ok: false,
          error: "Instancia WhatsApp nao encontrada.",
        },
        { status: 404 },
      );
    }

    if (!instance.externalInstanceId) {
      return Response.json(
        {
          ok: false,
          error:
            "Instancia sem externalInstanceId. Crie/provisione novamente antes de conectar.",
        },
        { status: 400 },
      );
    }

    const config = getWhatsAppProviderConfigStatus();
    if (!config.ok) {
      return Response.json(
        {
          ok: false,
          error: config.message,
          missingEnv: config.missingEnv,
        },
        { status: 400 },
      );
    }

    const provider = getWhatsAppProvider();
    const qr = await provider.fetchQrCode(instance.externalInstanceId);
    const status = await provider.getInstanceStatus(instance.externalInstanceId);

    const updated = await updateWhatsappInstanceConnection(instance.id, {
      status: mapProviderStateToInstanceStatus(status.status),
      qrCode: qr.qrCode || null,
      phoneNumber: status.phoneNumber || qr.phoneNumber || instance.phoneNumber,
      metadata: {
        ...(status.raw && typeof status.raw === "object" && !Array.isArray(status.raw)
          ? (status.raw as Record<string, unknown>)
          : {}),
        ...(qr.raw && typeof qr.raw === "object" && !Array.isArray(qr.raw)
          ? { qrSource: qr.raw as Record<string, unknown> }
          : {}),
        ...(qr.pairingCode ? { pairingCode: qr.pairingCode } : {}),
      },
    });

    return Response.json({ ok: true, data: updated });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao conectar instancia WhatsApp.",
      },
      { status: 502 },
    );
  }
}
