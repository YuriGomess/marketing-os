import { toggleAutomation } from "@/lib/automations/store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const data = await toggleAutomation(id);
    return Response.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao alternar automacao.";

    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status: message.includes("nao encontrada") ? 404 : 500 },
    );
  }
}
