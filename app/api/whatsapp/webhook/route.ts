import { getWhatsAppProvider } from "@/lib/integrations/whatsapp/provider";
import { persistWhatsappWebhookEvent } from "@/lib/whatsapp/store";

function isWebhookAuthorized(req: Request): boolean {
  const expected = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return true;
  }

  const provided =
    req.headers.get("x-webhook-secret") ||
    req.headers.get("x-evolution-secret") ||
    "";

  return provided.trim() === expected;
}

export async function POST(req: Request) {
  try {
    if (!isWebhookAuthorized(req)) {
      return Response.json(
        {
          ok: false,
          error: "Webhook nao autorizado.",
        },
        { status: 401 },
      );
    }

    const payload = await req.json();
    const provider = getWhatsAppProvider();
    const normalized = provider.normalizeWebhookEvent(payload);

    if (!normalized) {
      return Response.json(
        {
          ok: false,
          error: "Evento de webhook invalido ou nao suportado.",
        },
        { status: 400 },
      );
    }

    const result = await persistWhatsappWebhookEvent(normalized);

    return Response.json({
      ok: true,
      data: {
        accepted: true,
        result,
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao processar webhook WhatsApp.",
      },
      { status: 500 },
    );
  }
}
