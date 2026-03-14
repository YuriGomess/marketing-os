import { getWhatsAppProvider, getWhatsAppProviderConfigStatus } from "@/lib/integrations/whatsapp/provider";
import {
  getWhatsappInstanceById,
  updateWhatsappInstanceConnection,
} from "@/lib/whatsapp/store";
import { mapProviderStateToInstanceStatus } from "@/lib/whatsapp/mappers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
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
          ok: true,
          data: {
            status: instance.status,
            qrCode: instance.qrCode,
            phoneNumber: instance.phoneNumber,
            source: "database",
          },
        },
      );
    }

    const config = getWhatsAppProviderConfigStatus();
    if (!config.ok) {
      return Response.json(
        {
          ok: true,
          data: {
            status: instance.status,
            qrCode: instance.qrCode,
            phoneNumber: instance.phoneNumber,
            source: "database",
            warning: config.message,
          },
        },
      );
    }

    const provider = getWhatsAppProvider();
    const qr = await provider.fetchQrCode(instance.externalInstanceId);

    const updated = await updateWhatsappInstanceConnection(instance.id, {
      status: mapProviderStateToInstanceStatus(qr.status),
      qrCode: qr.qrCode || instance.qrCode,
      phoneNumber: qr.phoneNumber || instance.phoneNumber,
      metadata: {
        ...(qr.raw && typeof qr.raw === "object" && !Array.isArray(qr.raw)
          ? (qr.raw as Record<string, unknown>)
          : {}),
        ...(qr.pairingCode ? { pairingCode: qr.pairingCode } : {}),
      },
    });

    return Response.json({
      ok: true,
      data: {
        status: updated.status,
        qrCode: updated.qrCode,
        phoneNumber: updated.phoneNumber,
        source: "provider",
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao buscar QR code.",
      },
      { status: 502 },
    );
  }
}
