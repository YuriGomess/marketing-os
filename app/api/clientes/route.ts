import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { createdAt: "desc" },
    });

    return Response.json(clientes);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os clientes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data?.nome || typeof data.nome !== "string") {
      return Response.json(
        { error: "O campo 'nome' e obrigatorio." },
        { status: 400 },
      );
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome: data.nome,
        email: data.email ?? null,
        telefone: data.telefone ?? null,
        empresa: data.empresa ?? null,
        status: data.status ?? "ativo",
      },
    });

    return Response.json(cliente, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar o cliente.",
      },
      { status: 500 },
    );
  }
}
