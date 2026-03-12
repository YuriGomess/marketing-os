import { isValidCronExpression } from "@/lib/automations/cron";

export const AUTOMATION_PROVIDERS = [
  "META_ADS",
  "WHATSAPP",
  "GOOGLE_ADS",
  "TIKTOK_ADS",
  "FINANCE",
  "CRM",
  "TASKS",
  "NOTIFICATIONS",
  "INTERNAL",
] as const;

export const AUTOMATION_TRIGGER_TYPES = ["CRON", "MANUAL", "EVENT"] as const;
export const AUTOMATION_EXECUTION_MODES = ["SIMULATE", "LIVE"] as const;

export const AUTOMATION_OPERATORS = [
  "GREATER_THAN",
  "GREATER_THAN_OR_EQUAL",
  "LESS_THAN",
  "LESS_THAN_OR_EQUAL",
  "EQUAL",
  "NOT_EQUAL",
  "CONTAINS",
  "NOT_CONTAINS",
] as const;

export const AUTOMATION_ACTION_TYPES = [
  "NOTIFY",
  "ADJUST_BUDGET",
  "CREATE_TASK",
  "CREATE_ALERT",
  "CALL_WEBHOOK",
] as const;

export const AUTOMATION_SCOPE_ENTITY_TYPES = [
  "CLIENT",
  "INTEGRATION",
  "ACCOUNT",
  "CAMPAIGN",
  "ADSET",
  "AD",
  "CONTACT",
  "DEAL",
  "TASK",
  "CHANNEL",
  "CUSTOM",
] as const;

export type AutomationDraftProvider = (typeof AUTOMATION_PROVIDERS)[number];
export type AutomationDraftTriggerType = (typeof AUTOMATION_TRIGGER_TYPES)[number];
export type AutomationDraftExecutionMode = (typeof AUTOMATION_EXECUTION_MODES)[number];
export type AutomationDraftOperator = (typeof AUTOMATION_OPERATORS)[number];
export type AutomationDraftActionType = (typeof AUTOMATION_ACTION_TYPES)[number];
export type AutomationDraftScopeEntityType = (typeof AUTOMATION_SCOPE_ENTITY_TYPES)[number];

export type AutomationDraftScope = {
  entityType: AutomationDraftScopeEntityType;
  entityId: string;
  metadata?: Record<string, unknown> | null;
};

export type AutomationDraftRule = {
  metricKey: string;
  operator: AutomationDraftOperator;
  value: number;
  metadata?: Record<string, unknown> | null;
};

export type AutomationDraftAction = {
  actionType: AutomationDraftActionType;
  payload?: Record<string, unknown> | null;
  sortOrder?: number;
};

export type AutomationDraft = {
  name: string;
  description?: string | null;
  provider: AutomationDraftProvider;
  triggerType: AutomationDraftTriggerType;
  cronExpression: string;
  executionMode: AutomationDraftExecutionMode;
  isActive: boolean;
  isDraft: boolean;
  scopes: AutomationDraftScope[];
  rules: AutomationDraftRule[];
  actions: AutomationDraftAction[];
  draftPayload?: Record<string, unknown> | null;
};

export type AutomationDraftPreview = {
  title: string;
  summary: string;
  sections: {
    provider: string;
    schedule: string;
    scope: string[];
    conditions: string[];
    actions: string[];
    mode: string;
  };
  warnings: string[];
  ambiguities: string[];
};

function isKnown<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value as T[number]);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toStringOrDefault(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeScopes(input: unknown): AutomationDraftScope[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const scopes: AutomationDraftScope[] = [];

  for (const item of input) {
    const data = asRecord(item);
    if (!data) continue;
    if (!isKnown(data.entityType, AUTOMATION_SCOPE_ENTITY_TYPES)) continue;
    if (typeof data.entityId !== "string" || !data.entityId.trim()) continue;

    scopes.push({
      entityType: data.entityType,
      entityId: data.entityId.trim(),
      metadata: asRecord(data.metadata),
    });
  }

  return scopes;
}

function normalizeRules(input: unknown): AutomationDraftRule[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const rules: AutomationDraftRule[] = [];

  for (const item of input) {
    const data = asRecord(item);
    if (!data) continue;
    if (typeof data.metricKey !== "string" || !data.metricKey.trim()) continue;
    if (!isKnown(data.operator, AUTOMATION_OPERATORS)) continue;

    const value = Number(data.value);
    if (!Number.isFinite(value)) continue;

    rules.push({
      metricKey: data.metricKey.trim(),
      operator: data.operator,
      value,
      metadata: asRecord(data.metadata),
    });
  }

  return rules;
}

function normalizeActions(input: unknown): AutomationDraftAction[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const actions: AutomationDraftAction[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const data = asRecord(input[index]);
    if (!data) continue;
    if (!isKnown(data.actionType, AUTOMATION_ACTION_TYPES)) continue;

    const sortOrderRaw = Number(data.sortOrder);

    actions.push({
      actionType: data.actionType,
      payload: asRecord(data.payload),
      sortOrder: Number.isFinite(sortOrderRaw) ? sortOrderRaw : index,
    });
  }

  return actions.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function normalizeAutomationDraft(input: unknown): {
  draft: AutomationDraft;
  issues: string[];
} {
  const data = asRecord(input) || {};
  const issues: string[] = [];

  const provider = isKnown(data.provider, AUTOMATION_PROVIDERS)
    ? data.provider
    : "META_ADS";
  if (!isKnown(data.provider, AUTOMATION_PROVIDERS)) {
    issues.push("Provider ausente/invalido. Foi aplicado META_ADS por padrao.");
  }

  const triggerType = isKnown(data.triggerType, AUTOMATION_TRIGGER_TYPES)
    ? data.triggerType
    : "CRON";
  if (!isKnown(data.triggerType, AUTOMATION_TRIGGER_TYPES)) {
    issues.push("Trigger ausente/invalido. Foi aplicado CRON por padrao.");
  }

  const executionMode = isKnown(data.executionMode, AUTOMATION_EXECUTION_MODES)
    ? data.executionMode
    : "SIMULATE";
  if (!isKnown(data.executionMode, AUTOMATION_EXECUTION_MODES)) {
    issues.push("ExecutionMode ausente/invalido. Foi aplicado SIMULATE por padrao.");
  }

  const cronExpression = toStringOrDefault(data.cronExpression, "0 9 * * *");
  if (triggerType === "CRON" && !isValidCronExpression(cronExpression)) {
    issues.push("Expressao cron invalida. Foi aplicado fallback para '0 9 * * *'.");
  }

  const normalizedCron =
    triggerType === "CRON" && isValidCronExpression(cronExpression)
      ? cronExpression
      : "0 9 * * *";

  const scopes = normalizeScopes(data.scopes);
  const rules = normalizeRules(data.rules);
  const actions = normalizeActions(data.actions);

  if (actions.length === 0) {
    issues.push("Nenhuma acao valida foi identificada. Inclua ao menos uma acao.");
  }

  if (rules.length === 0) {
    issues.push("Nenhuma regra valida foi identificada. A automacao pode executar sem condicoes.");
  }

  const draft: AutomationDraft = {
    name: toStringOrDefault(data.name, "Automacao criada com IA"),
    description:
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : null,
    provider,
    triggerType,
    cronExpression: normalizedCron,
    executionMode,
    isActive: typeof data.isActive === "boolean" ? data.isActive : false,
    isDraft: typeof data.isDraft === "boolean" ? data.isDraft : true,
    scopes,
    rules,
    actions,
    draftPayload: asRecord(data.draftPayload),
  };

  return { draft, issues };
}

export function validateAutomationDraft(input: unknown): {
  ok: boolean;
  draft: AutomationDraft;
  issues: string[];
} {
  const { draft, issues } = normalizeAutomationDraft(input);

  if (!draft.name.trim()) {
    issues.push("Nome da automacao e obrigatorio.");
  }

  if (draft.triggerType === "CRON" && !isValidCronExpression(draft.cronExpression)) {
    issues.push("Expressao cron invalida para trigger CRON.");
  }

  if (draft.actions.length === 0) {
    issues.push("Ao menos uma acao e obrigatoria para salvar.");
  }

  return {
    ok: issues.length === 0,
    draft,
    issues,
  };
}

export function buildAutomationPreview(
  draft: AutomationDraft,
  options?: { ambiguities?: string[]; extraWarnings?: string[] },
): AutomationDraftPreview {
  const warnings: string[] = [...(options?.extraWarnings || [])];

  if (draft.executionMode === "LIVE") {
    warnings.push("Modo LIVE pode executar efeitos reais quando o executor estiver completo.");
  }

  if (draft.actions.some((action) => action.actionType === "ADJUST_BUDGET")) {
    warnings.push("Acao ADJUST_BUDGET ainda depende de executor provider-specific nesta etapa.");
  }

  if (
    draft.actions.some(
      (action) => action.actionType === "NOTIFY" && action.payload?.channel === "whatsapp",
    )
  ) {
    warnings.push("Notificacao via WhatsApp pode exigir integração adicional de envio.");
  }

  const schedule =
    draft.triggerType === "CRON"
      ? `Executa por cron: ${draft.cronExpression}`
      : `Trigger: ${draft.triggerType}`;

  return {
    title: draft.name,
    summary: draft.description || "Sem descricao detalhada.",
    sections: {
      provider: draft.provider,
      schedule,
      scope:
        draft.scopes.length > 0
          ? draft.scopes.map((scope) => `${scope.entityType}: ${scope.entityId}`)
          : ["Sem escopo especifico."],
      conditions:
        draft.rules.length > 0
          ? draft.rules.map(
              (rule) => `${rule.metricKey} ${rule.operator} ${rule.value}`,
            )
          : ["Sem regras. Pode executar sempre que disparar."],
      actions: draft.actions.map((action) => action.actionType),
      mode: draft.executionMode,
    },
    warnings,
    ambiguities: options?.ambiguities || [],
  };
}
