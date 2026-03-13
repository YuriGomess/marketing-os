import { deleteWhatsappInstanceById, getWhatsappInstanceById } from "@/lib/whatsapp/store";
import { getWhatsAppProviderConfigStatus } from "@/lib/integrations/whatsapp/provider";

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

    return Response.json({
      ok: true,
      data: instance,
      providerConfig: getWhatsAppProviderConfigStatus(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao carregar instancia WhatsApp.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
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

    await deleteWhatsappInstanceById(id);

    return Response.json({
      ok: true,
      data: { id },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao excluir instancia WhatsApp.",
      },
      { status: 500 },
    );
  }
}
