import { WhatsappProvider } from "@prisma/client";
import { getWhatsAppProvider, getWhatsAppProviderConfigStatus } from "@/lib/integrations/whatsapp/provider";
import {
  createWhatsappInstance,
  listWhatsappInstances,
  updateWhatsappInstanceConnection,
} from "@/lib/whatsapp/store";
import { mapProviderStateToInstanceStatus } from "@/lib/whatsapp/mappers";

export async function GET() {
  try {
    const data = await listWhatsappInstances();
    const config = getWhatsAppProviderConfigStatus();

    return Response.json({
      ok: true,
      data,
      providerConfig: config,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar instancias WhatsApp.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (typeof body?.name !== "string" || !body.name.trim()) {
      return Response.json(
        {
          ok: false,
          error: "Campo 'name' e obrigatorio.",
        },
        { status: 400 },
      );
    }

    const config = getWhatsAppProviderConfigStatus();

    const instance = await createWhatsappInstance({
      name: body.name,
      provider: WhatsappProvider.EVOLUTION,
      webhookUrl:
        typeof body?.webhookUrl === "string" && body.webhookUrl.trim()
          ? body.webhookUrl.trim()
          : null,
    });

    if (!config.ok) {
      return Response.json({
        ok: true,
        data: instance,
        warning: config.message,
        providerConfig: config,
      });
    }

    try {
      const provider = getWhatsAppProvider();
      const created = await provider.createInstance({
        name: instance.name,
        webhookUrl: instance.webhookUrl,
      });

      const updated = await updateWhatsappInstanceConnection(instance.id, {
        externalInstanceId: created.externalInstanceId || instance.name,
        status: mapProviderStateToInstanceStatus(created.status),
        qrCode: created.qrCode || null,
        phoneNumber: created.phoneNumber || null,
        webhookUrl: created.webhookUrl || instance.webhookUrl,
        metadata:
          created.raw && typeof created.raw === "object" && !Array.isArray(created.raw)
            ? (created.raw as Record<string, unknown>)
            : null,
      });

      return Response.json({ ok: true, data: updated }, { status: 201 });
    } catch (providerError) {
      await updateWhatsappInstanceConnection(instance.id, {
        status: mapProviderStateToInstanceStatus("ERROR"),
        metadata: {
          providerError:
            providerError instanceof Error
              ? providerError.message
              : "Erro ao provisionar instancia no provider.",
        },
      });

      return Response.json(
        {
          ok: false,
          error:
            providerError instanceof Error
              ? providerError.message
              : "Falha ao criar instancia no provider.",
          data: instance,
        },
        { status: 502 },
      );
    }
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao criar instancia WhatsApp.",
      },
      { status: 500 },
    );
  }
}
