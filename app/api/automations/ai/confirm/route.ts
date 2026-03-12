import {
  AutomationActionType,
  AutomationExecutionMode,
  AutomationOperator,
  AutomationProvider,
  AutomationScopeEntityType,
  AutomationTriggerType,
  Prisma,
} from "@prisma/client";
import { buildAutomationPreview, validateAutomationDraft } from "@/lib/automations/draft";
import { createAutomation } from "@/lib/automations/store";

function toObjectOrNull(value: unknown): Prisma.InputJsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Prisma.InputJsonObject;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = validateAutomationDraft(body?.draft);

    if (!validated.ok) {
      return Response.json(
        {
          ok: false,
          error: "Draft invalido para confirmacao.",
          issues: validated.issues,
          preview: buildAutomationPreview(validated.draft),
        },
        { status: 400 },
      );
    }

    const requestText =
      typeof body?.request === "string" && body.request.trim()
        ? body.request.trim()
        : null;

    const saved = await createAutomation({
      name: validated.draft.name,
      description: validated.draft.description || null,
      provider: AutomationProvider[validated.draft.provider],
      triggerType: AutomationTriggerType[validated.draft.triggerType],
      cronExpression: validated.draft.cronExpression,
      executionMode: AutomationExecutionMode[validated.draft.executionMode],
      isActive: validated.draft.isActive,
      isDraft: false,
      draftPayload: {
        ...(validated.draft.draftPayload || {}),
        source: "automation-agent",
        originalRequest: requestText,
        confirmedAt: new Date().toISOString(),
      } as Prisma.InputJsonObject,
      scopes: validated.draft.scopes.map((scope) => ({
        entityType: AutomationScopeEntityType[scope.entityType],
        entityId: scope.entityId,
        metadata: toObjectOrNull(scope.metadata),
      })),
      rules: validated.draft.rules.map((rule) => ({
        metricKey: rule.metricKey,
        operator: AutomationOperator[rule.operator],
        value: rule.value,
        metadata: toObjectOrNull(rule.metadata),
      })),
      actions: validated.draft.actions.map((action, index) => ({
        actionType: AutomationActionType[action.actionType],
        sortOrder:
          typeof action.sortOrder === "number" && Number.isFinite(action.sortOrder)
            ? action.sortOrder
            : index,
        payload: toObjectOrNull(action.payload),
      })),
    });

    return Response.json({ ok: true, data: saved });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao confirmar e salvar automacao.",
      },
      { status: 500 },
    );
  }
}
