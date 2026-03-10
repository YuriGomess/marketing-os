import { processAgentMessage } from "@/lib/ai/orchestrator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message : "";

    if (!message) {
      return Response.json(
        { error: "Campo 'message' e obrigatorio." },
        { status: 400 },
      );
    }

    const result = await processAgentMessage({
      message,
      clientId: typeof body?.clientId === "string" ? body.clientId : undefined,
      conversationId:
        typeof body?.conversationId === "string"
          ? body.conversationId
          : undefined,
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? body.metadata
          : undefined,
    });

    return Response.json({ ok: true, data: result });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado no endpoint de IA.",
      },
      { status: 500 },
    );
  }
}

