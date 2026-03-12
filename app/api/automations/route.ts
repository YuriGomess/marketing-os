import { createAutomation, listAutomations } from "@/lib/automations/store";
import { parseAutomationUpsertBody } from "@/lib/automations/payload";

export async function GET() {
  try {
    const data = await listAutomations();
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar automacoes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = parseAutomationUpsertBody(body);
    const created = await createAutomation(parsed);

    return Response.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao criar automacao.",
      },
      { status: 500 },
    );
  }
}
