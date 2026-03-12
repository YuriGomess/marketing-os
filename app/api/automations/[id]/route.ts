import { getAutomationById, updateAutomation } from "@/lib/automations/store";
import { parseAutomationUpsertBody } from "@/lib/automations/payload";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const data = await getAutomationById(id);

    if (!data) {
      return Response.json(
        { ok: false, error: "Automacao nao encontrada." },
        { status: 404 },
      );
    }

    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao carregar automacao.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = parseAutomationUpsertBody(body);
    const updated = await updateAutomation(id, parsed);
    return Response.json({ ok: true, data: updated });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar automacao.",
      },
      { status: 500 },
    );
  }
}
