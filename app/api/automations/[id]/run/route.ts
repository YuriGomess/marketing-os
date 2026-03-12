import { runAutomationById } from "@/lib/automations/runner";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const result = await runAutomationById(id, {
      manual: true,
      metrics:
        body?.metrics && typeof body.metrics === "object"
          ? body.metrics
          : undefined,
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? body.metadata
          : undefined,
    });

    return Response.json({ ok: result.ok, data: result });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao executar automacao manualmente.",
      },
      { status: 500 },
    );
  }
}
