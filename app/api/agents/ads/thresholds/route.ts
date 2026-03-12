import {
  getAdsAgentConfigView,
  updateAdsAgentThresholds,
} from "@/lib/agents/ads/config-store";

export async function GET() {
  try {
    const data = await getAdsAgentConfigView();
    return Response.json({ ok: true, data: data.thresholds });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao carregar thresholds do Ads Agent.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const thresholds: unknown[] = Array.isArray(body?.thresholds)
      ? body.thresholds
      : [];

    const normalized = thresholds
      .filter((item): item is { key: string; value: number } => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const value = item as { key?: unknown; value?: unknown };
        return (
          typeof value.key === "string" &&
          typeof value.value === "number" &&
          Number.isFinite(value.value)
        );
      })
      .map((item) => ({
        key: item.key,
        value: item.value,
      }));

    const data = await updateAdsAgentThresholds(normalized);
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao salvar thresholds do Ads Agent.",
      },
      { status: 500 },
    );
  }
}
