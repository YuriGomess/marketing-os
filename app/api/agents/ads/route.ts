import {
  getAdsAgentConfigView,
  updateAdsAgentConfig,
} from "@/lib/agents/ads/config-store";

export async function GET() {
  try {
    const data = await getAdsAgentConfigView();
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao carregar configuracao do Ads Agent.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const updated = await updateAdsAgentConfig({
      isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
      systemPrompt:
        typeof body?.systemPrompt === "string" ? body.systemPrompt : undefined,
      strategicContext:
        typeof body?.strategicContext === "string" || body?.strategicContext === null
          ? body.strategicContext
          : undefined,
      executionMode:
        body?.executionMode === "READ_ONLY" ||
        body?.executionMode === "SUGGEST_ONLY" ||
        body?.executionMode === "CONFIRM_BEFORE_ACTION"
          ? body.executionMode
          : undefined,
      modelName:
        typeof body?.modelName === "string" || body?.modelName === null
          ? body.modelName
          : undefined,
      temperature:
        typeof body?.temperature === "number" || body?.temperature === null
          ? body.temperature
          : undefined,
    });

    return Response.json({ ok: true, data: updated });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao salvar configuracao do Ads Agent.",
      },
      { status: 500 },
    );
  }
}
