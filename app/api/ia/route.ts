import { processAgentMessage } from "@/lib/ai/orchestrator";

const ACCEPTED_ATTACHMENT_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".csv",
  ".xlsx",
  ".txt",
  ".docx",
] as const;

function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_ATTACHMENT_EXTENSIONS.some((extension) =>
    lower.endsWith(extension),
  );
}

function parseMetadata(input: FormDataEntryValue | null): Record<string, unknown> | undefined {
  if (typeof input !== "string" || !input.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let message = "";
    let clientId: string | undefined;
    let conversationId: string | undefined;
    let metadata: Record<string, unknown> | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      message = typeof formData.get("message") === "string" ? (formData.get("message") as string) : "";
      clientId = typeof formData.get("clientId") === "string" ? (formData.get("clientId") as string) : undefined;
      conversationId =
        typeof formData.get("conversationId") === "string"
          ? (formData.get("conversationId") as string)
          : undefined;
      metadata = parseMetadata(formData.get("metadata"));

      const attachment = formData.get("attachment");
      if (attachment instanceof File) {
        if (!hasAcceptedExtension(attachment.name)) {
          return Response.json(
            {
              ok: false,
              error: "Formato de anexo nao suportado. Formatos aceitos: .pdf, .png, .jpg, .jpeg, .csv, .xlsx, .txt, .docx.",
            },
            { status: 400 },
          );
        }

        metadata = {
          ...(metadata || {}),
          attachment: {
            name: attachment.name,
            size: attachment.size,
            type: attachment.type || "application/octet-stream",
          },
        };
      }
    } else {
      const body = await req.json();
      message = typeof body?.message === "string" ? body.message : "";
      clientId = typeof body?.clientId === "string" ? body.clientId : undefined;
      conversationId =
        typeof body?.conversationId === "string"
          ? body.conversationId
          : undefined;
      metadata =
        body?.metadata && typeof body.metadata === "object"
          ? body.metadata
          : undefined;
    }

    if (!message) {
      return Response.json(
        { error: "Campo 'message' e obrigatorio." },
        { status: 400 },
      );
    }

    const result = await processAgentMessage({
      message,
      clientId,
      conversationId,
      metadata,
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

