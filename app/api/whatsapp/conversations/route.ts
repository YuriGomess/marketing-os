import { listWhatsappConversations } from "@/lib/whatsapp/store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get("instanceId") || undefined;

    const data = await listWhatsappConversations({ instanceId });

    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar conversas WhatsApp.",
      },
      { status: 500 },
    );
  }
}
