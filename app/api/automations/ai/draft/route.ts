import { generateAutomationDraftFromNaturalLanguage } from "@/lib/agents/automation/agent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const request = typeof body?.request === "string" ? body.request : "";
    const context =
      body?.context && typeof body.context === "object"
        ? (body.context as Record<string, unknown>)
        : undefined;

    if (!request.trim()) {
      return Response.json(
        {
          ok: false,
          error: "Campo 'request' e obrigatorio.",
        },
        { status: 400 },
      );
    }

    const result = await generateAutomationDraftFromNaturalLanguage({
      request,
      context,
    });

    if (!result.ok) {
      return Response.json(
        {
          ok: false,
          error: result.error || "Falha ao gerar draft de automacao.",
        },
        { status: 500 },
      );
    }

    return Response.json({ ok: true, data: result });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao gerar draft com IA.",
      },
      { status: 500 },
    );
  }
}
