import {
  getAdsAgentConfigView,
  updateAdsAgentTools,
} from "@/lib/agents/ads/config-store";

export async function GET() {
  try {
    const data = await getAdsAgentConfigView();
    return Response.json({ ok: true, data: data.tools });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao carregar tools do Ads Agent.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const tools: unknown[] = Array.isArray(body?.tools) ? body.tools : [];

    const normalized = tools
      .filter((item): item is { toolName: string; isEnabled: boolean } => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const value = item as { toolName?: unknown; isEnabled?: unknown };
        return (
          typeof value.toolName === "string" &&
          typeof value.isEnabled === "boolean"
        );
      })
      .map((item) => ({
        toolName: item.toolName,
        isEnabled: item.isEnabled,
      }));

    const data = await updateAdsAgentTools(normalized);
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao salvar tools do Ads Agent.",
      },
      { status: 500 },
    );
  }
}
