import { getWhatsAppProvider, getWhatsAppProviderConfigStatus } from "@/lib/integrations/whatsapp/provider";
import {
  createOutgoingWhatsappMessage,
  getWhatsappConversationById,
  listWhatsappMessages,
} from "@/lib/whatsapp/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const conversation = await getWhatsappConversationById(id);

    if (!conversation) {
      return Response.json(
        {
          ok: false,
          error: "Conversa WhatsApp nao encontrada.",
        },
        { status: 404 },
      );
    }

    const data = await listWhatsappMessages(conversation.id);
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar mensagens da conversa.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (typeof body?.text !== "string" || !body.text.trim()) {
      return Response.json(
        {
          ok: false,
          error: "Campo 'text' e obrigatorio.",
        },
        { status: 400 },
      );
    }

    const conversation = await getWhatsappConversationById(id);
    if (!conversation) {
      return Response.json(
        {
          ok: false,
          error: "Conversa WhatsApp nao encontrada.",
        },
        { status: 404 },
      );
    }

    if (!conversation.instance.externalInstanceId) {
      return Response.json(
        {
          ok: false,
          error: "Instancia sem externalInstanceId para envio via provider.",
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

    const to = conversation.contact.phone;
    if (!to) {
      return Response.json(
        {
          ok: false,
          error: "Contato da conversa sem telefone valido.",
        },
        { status: 400 },
      );
    }

    const provider = getWhatsAppProvider();
    const providerResult = await provider.sendMessage({
      instanceExternalId: conversation.instance.externalInstanceId,
      to,
      text: body.text.trim(),
    });

    const created = await createOutgoingWhatsappMessage({
      instanceId: conversation.instanceId,
      conversationId: conversation.id,
      contactId: conversation.contactId,
      externalMessageId: providerResult.externalMessageId || null,
      textContent: body.text.trim(),
      rawPayload:
        providerResult.raw &&
        typeof providerResult.raw === "object" &&
        !Array.isArray(providerResult.raw)
          ? (providerResult.raw as Record<string, unknown>)
          : undefined,
      sentAt: providerResult.sentAt ? new Date(providerResult.sentAt) : new Date(),
    });

    return Response.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao enviar mensagem WhatsApp.",
      },
      { status: 502 },
    );
  }
}
