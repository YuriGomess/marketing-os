import {
  AutomationActionType,
  AutomationExecutionMode,
  AutomationOperator,
  AutomationProvider,
  AutomationScopeEntityType,
  AutomationTriggerType,
  Prisma,
} from "@prisma/client";
import type {
  AutomationActionInput,
  AutomationRuleInput,
  AutomationScopeInput,
  AutomationUpsertInput,
} from "@/lib/automations/store";

const PROVIDERS = new Set<string>(Object.values(AutomationProvider));
const TRIGGERS = new Set<string>(Object.values(AutomationTriggerType));
const EXEC_MODES = new Set<string>(Object.values(AutomationExecutionMode));
const OPERATORS = new Set<string>(Object.values(AutomationOperator));
const ACTION_TYPES = new Set<string>(Object.values(AutomationActionType));
const SCOPE_TYPES = new Set<string>(Object.values(AutomationScopeEntityType));

function asJsonValue(input: unknown): Prisma.InputJsonValue | null {
  if (input === undefined) {
    return null;
  }

  return input as Prisma.InputJsonValue;
}

function parseScopes(input: unknown): AutomationScopeInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const parsed: AutomationScopeInput[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") {
      continue;
    }

      const data = item as Record<string, unknown>;
      if (
        typeof data.entityType !== "string" ||
        !SCOPE_TYPES.has(data.entityType) ||
        typeof data.entityId !== "string"
      ) {
        continue;
      }

      parsed.push({
        entityType: data.entityType as AutomationScopeEntityType,
        entityId: data.entityId,
        metadata: asJsonValue(data.metadata),
      });
  }

  return parsed;
}

function parseRules(input: unknown): AutomationRuleInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const parsed: AutomationRuleInput[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") {
      continue;
    }

      const data = item as Record<string, unknown>;
      if (
        typeof data.metricKey !== "string" ||
        typeof data.operator !== "string" ||
        !OPERATORS.has(data.operator)
      ) {
        continue;
      }

      const value = Number(data.value);
      if (!Number.isFinite(value)) {
        continue;
      }

      parsed.push({
        metricKey: data.metricKey,
        operator: data.operator as AutomationOperator,
        value,
        metadata: asJsonValue(data.metadata),
      });
  }

  return parsed;
}

function parseActions(input: unknown): AutomationActionInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const parsed: AutomationActionInput[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const item = input[index];
    if (!item || typeof item !== "object") {
      continue;
    }

      const data = item as Record<string, unknown>;
      if (typeof data.actionType !== "string" || !ACTION_TYPES.has(data.actionType)) {
        continue;
      }

      const sortOrderRaw = Number(data.sortOrder);

      parsed.push({
        actionType: data.actionType as AutomationActionType,
        payload: asJsonValue(data.payload),
        sortOrder: Number.isFinite(sortOrderRaw) ? sortOrderRaw : index,
      });
  }

  return parsed;
}

export function parseAutomationUpsertBody(body: unknown): AutomationUpsertInput {
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;

  if (typeof data.name !== "string" || !data.name.trim()) {
    throw new Error("Campo 'name' e obrigatorio.");
  }

  if (typeof data.provider !== "string" || !PROVIDERS.has(data.provider)) {
    throw new Error("Campo 'provider' invalido.");
  }

  if (typeof data.triggerType !== "string" || !TRIGGERS.has(data.triggerType)) {
    throw new Error("Campo 'triggerType' invalido.");
  }

  if (
    typeof data.executionMode !== "string" ||
    !EXEC_MODES.has(data.executionMode)
  ) {
    throw new Error("Campo 'executionMode' invalido.");
  }

  if (typeof data.cronExpression !== "string") {
    throw new Error("Campo 'cronExpression' e obrigatorio.");
  }

  return {
    name: data.name,
    description: typeof data.description === "string" ? data.description : null,
    provider: data.provider as AutomationProvider,
    triggerType: data.triggerType as AutomationTriggerType,
    cronExpression: data.cronExpression,
    executionMode: data.executionMode as AutomationExecutionMode,
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    isDraft: typeof data.isDraft === "boolean" ? data.isDraft : false,
    draftPayload: asJsonValue(data.draftPayload),
    scopes: parseScopes(data.scopes),
    rules: parseRules(data.rules),
    actions: parseActions(data.actions),
  };
}
