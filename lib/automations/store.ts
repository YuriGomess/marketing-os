import {
  AutomationActionType,
  AutomationExecutionMode,
  AutomationOperator,
  AutomationProvider,
  AutomationRunStatus,
  AutomationScopeEntityType,
  AutomationTriggerType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeNextRunAt, isValidCronExpression } from "@/lib/automations/cron";

export type AutomationScopeInput = {
  entityType: AutomationScopeEntityType;
  entityId: string;
  metadata?: Prisma.InputJsonValue | null;
};

export type AutomationRuleInput = {
  metricKey: string;
  operator: AutomationOperator;
  value: number;
  metadata?: Prisma.InputJsonValue | null;
};

export type AutomationActionInput = {
  actionType: AutomationActionType;
  payload?: Prisma.InputJsonValue | null;
  sortOrder?: number;
};

export type AutomationUpsertInput = {
  name: string;
  description?: string | null;
  provider: AutomationProvider;
  triggerType: AutomationTriggerType;
  cronExpression: string;
  executionMode: AutomationExecutionMode;
  isActive?: boolean;
  isDraft?: boolean;
  draftPayload?: Prisma.InputJsonValue | null;
  scopes: AutomationScopeInput[];
  rules: AutomationRuleInput[];
  actions: AutomationActionInput[];
};

function sanitizeCronExpression(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function normalizeScopes(input: AutomationScopeInput[]): AutomationScopeInput[] {
  return input
    .map((scope) => ({
      entityType: scope.entityType,
      entityId: scope.entityId.trim(),
      metadata: scope.metadata ?? null,
    }))
    .filter((scope) => scope.entityId.length > 0);
}

function normalizeRules(input: AutomationRuleInput[]): AutomationRuleInput[] {
  return input
    .map((rule) => ({
      metricKey: rule.metricKey.trim(),
      operator: rule.operator,
      value: Number(rule.value),
      metadata: rule.metadata ?? null,
    }))
    .filter((rule) => rule.metricKey.length > 0 && Number.isFinite(rule.value));
}

function normalizeActions(input: AutomationActionInput[]): AutomationActionInput[] {
  return input
    .map((action, index) => ({
      actionType: action.actionType,
      payload: action.payload ?? null,
      sortOrder:
        typeof action.sortOrder === "number" && Number.isInteger(action.sortOrder)
          ? action.sortOrder
          : index,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function ensureValidInput(input: AutomationUpsertInput): {
  cronExpression: string;
  scopes: AutomationScopeInput[];
  rules: AutomationRuleInput[];
  actions: AutomationActionInput[];
} {
  if (!input.name || !input.name.trim()) {
    throw new Error("Nome da automacao e obrigatorio.");
  }

  const cronExpression = sanitizeCronExpression(input.cronExpression || "");

  if (input.triggerType === AutomationTriggerType.CRON) {
    if (!cronExpression || !isValidCronExpression(cronExpression)) {
      throw new Error("Expressao cron invalida.");
    }
  }

  const scopes = normalizeScopes(input.scopes || []);
  const rules = normalizeRules(input.rules || []);
  const actions = normalizeActions(input.actions || []);

  if (actions.length === 0) {
    throw new Error("Ao menos uma acao e obrigatoria para a automacao.");
  }

  return { cronExpression, scopes, rules, actions };
}

function calculateNextRunAt(
  triggerType: AutomationTriggerType,
  cronExpression: string,
  isActive: boolean,
): Date | null {
  if (!isActive) {
    return null;
  }

  if (triggerType !== AutomationTriggerType.CRON) {
    return null;
  }

  return computeNextRunAt(cronExpression, new Date());
}

const automationListInclude = {
  scopes: true,
  rules: true,
  actions: {
    orderBy: { sortOrder: "asc" as const },
  },
  runs: {
    orderBy: { startedAt: "desc" as const },
    take: 1,
  },
  _count: {
    select: { runs: true },
  },
};

export async function listAutomations() {
  return prisma.automation.findMany({
    orderBy: { updatedAt: "desc" },
    include: automationListInclude,
  });
}

export async function getAutomationById(id: string) {
  return prisma.automation.findUnique({
    where: { id },
    include: {
      scopes: true,
      rules: true,
      actions: { orderBy: { sortOrder: "asc" } },
      runs: { orderBy: { startedAt: "desc" }, take: 20 },
      _count: { select: { runs: true } },
    },
  });
}

export async function createAutomation(input: AutomationUpsertInput) {
  const normalizedName = input.name.trim();
  const normalizedDescription = input.description?.trim() || null;
  const { cronExpression, scopes, rules, actions } = ensureValidInput(input);
  const isActive = input.isActive ?? true;
  const nextRunAt = calculateNextRunAt(input.triggerType, cronExpression, isActive);

  return prisma.automation.create({
    data: {
      name: normalizedName,
      description: normalizedDescription,
      provider: input.provider,
      triggerType: input.triggerType,
      cronExpression,
      executionMode: input.executionMode,
      isActive,
      isDraft: input.isDraft ?? false,
      draftPayload: input.draftPayload ?? undefined,
      nextRunAt,
      scopes: {
        create: scopes.map((scope) => ({
          entityType: scope.entityType,
          entityId: scope.entityId,
          metadata: scope.metadata ?? undefined,
        })),
      },
      rules: {
        create: rules.map((rule) => ({
          metricKey: rule.metricKey,
          operator: rule.operator,
          value: rule.value,
          metadata: rule.metadata ?? undefined,
        })),
      },
      actions: {
        create: actions.map((action) => ({
          actionType: action.actionType,
          payload: action.payload ?? undefined,
          sortOrder: action.sortOrder ?? 0,
        })),
      },
    },
    include: automationListInclude,
  });
}

export async function updateAutomation(id: string, input: AutomationUpsertInput) {
  const normalizedName = input.name.trim();
  const normalizedDescription = input.description?.trim() || null;
  const { cronExpression, scopes, rules, actions } = ensureValidInput(input);
  const isActive = input.isActive ?? true;
  const nextRunAt = calculateNextRunAt(input.triggerType, cronExpression, isActive);

  return prisma.automation.update({
    where: { id },
    data: {
      name: normalizedName,
      description: normalizedDescription,
      provider: input.provider,
      triggerType: input.triggerType,
      cronExpression,
      executionMode: input.executionMode,
      isActive,
      isDraft: input.isDraft ?? false,
      draftPayload: input.draftPayload ?? undefined,
      nextRunAt,
      scopes: {
        deleteMany: {},
        create: scopes.map((scope) => ({
          entityType: scope.entityType,
          entityId: scope.entityId,
          metadata: scope.metadata ?? undefined,
        })),
      },
      rules: {
        deleteMany: {},
        create: rules.map((rule) => ({
          metricKey: rule.metricKey,
          operator: rule.operator,
          value: rule.value,
          metadata: rule.metadata ?? undefined,
        })),
      },
      actions: {
        deleteMany: {},
        create: actions.map((action) => ({
          actionType: action.actionType,
          payload: action.payload ?? undefined,
          sortOrder: action.sortOrder ?? 0,
        })),
      },
    },
    include: automationListInclude,
  });
}

export async function toggleAutomation(id: string) {
  const current = await prisma.automation.findUnique({ where: { id } });

  if (!current) {
    throw new Error("Automacao nao encontrada.");
  }

  const nextIsActive = !current.isActive;
  const nextRunAt = calculateNextRunAt(
    current.triggerType,
    current.cronExpression,
    nextIsActive,
  );

  return prisma.automation.update({
    where: { id },
    data: {
      isActive: nextIsActive,
      nextRunAt,
    },
    include: automationListInclude,
  });
}

export async function createAutomationRun(
  automationId: string,
  input?: Prisma.InputJsonValue,
) {
  return prisma.automationRun.create({
    data: {
      automationId,
      status: AutomationRunStatus.RUNNING,
      input: input ?? undefined,
      startedAt: new Date(),
    },
  });
}

export async function finalizeAutomationRun(params: {
  runId: string;
  automationId: string;
  status: AutomationRunStatus;
  output?: Prisma.InputJsonValue | null;
  errorMessage?: string | null;
}) {
  const now = new Date();

  const automation = await prisma.automation.findUnique({
    where: { id: params.automationId },
  });

  const nextRunAt = automation
    ? calculateNextRunAt(
        automation.triggerType,
        automation.cronExpression,
        automation.isActive,
      )
    : null;

  await prisma.$transaction([
    prisma.automationRun.update({
      where: { id: params.runId },
      data: {
        status: params.status,
        output: params.output ?? undefined,
        errorMessage: params.errorMessage ?? null,
        finishedAt: now,
      },
    }),
    prisma.automation.update({
      where: { id: params.automationId },
      data: {
        lastRunAt: now,
        nextRunAt,
      },
    }),
  ]);
}

export async function listDueAutomations(referenceDate: Date = new Date()) {
  return prisma.automation.findMany({
    where: {
      isActive: true,
      triggerType: AutomationTriggerType.CRON,
      nextRunAt: {
        lte: referenceDate,
      },
    },
    include: {
      scopes: true,
      rules: true,
      actions: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: {
      nextRunAt: "asc",
    },
  });
}

export async function touchAutomationSchedule(id: string) {
  const current = await prisma.automation.findUnique({ where: { id } });

  if (!current) {
    return null;
  }

  const nextRunAt = calculateNextRunAt(
    current.triggerType,
    current.cronExpression,
    current.isActive,
  );

  return prisma.automation.update({
    where: { id },
    data: { nextRunAt },
  });
}
