import { AutomationRunStatus, Prisma } from "@prisma/client";
import {
  createAutomationRun,
  finalizeAutomationRun,
  getAutomationById,
  listDueAutomations,
} from "@/lib/automations/store";
import { evaluateAutomationRules } from "@/lib/automations/evaluator";
import { executeAutomationActions } from "@/lib/automations/executor";

export type AutomationRunInput = {
  manual?: boolean;
  metrics?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type AutomationRunResult = {
  ok: boolean;
  status: AutomationRunStatus;
  message: string;
  runId?: string;
  details?: Record<string, unknown>;
};

export async function runAutomationById(
  automationId: string,
  input: AutomationRunInput = {},
): Promise<AutomationRunResult> {
  const automation = await getAutomationById(automationId);

  if (!automation) {
    return {
      ok: false,
      status: AutomationRunStatus.FAILED,
      message: "Automacao nao encontrada.",
    };
  }

  if (!automation.isActive && !input.manual) {
    return {
      ok: false,
      status: AutomationRunStatus.SKIPPED,
      message: "Automacao inativa. Ative antes de executar por cron.",
    };
  }

  const run = await createAutomationRun(automation.id, {
    manual: input.manual ?? false,
    metrics: input.metrics ?? {},
    metadata: input.metadata ?? {},
  } as Prisma.InputJsonValue);

  try {
    const evaluation = evaluateAutomationRules(automation.rules, {
      metrics: (input.metrics || {}) as Record<string, string | number | boolean | null | undefined>,
    });

    if (automation.rules.length > 0 && !evaluation.passed) {
      await finalizeAutomationRun({
        runId: run.id,
        automationId: automation.id,
        status: AutomationRunStatus.SKIPPED,
        output: {
          reason: "rules_not_matched",
          evaluation,
        } as Prisma.InputJsonValue,
      });

      return {
        ok: true,
        status: AutomationRunStatus.SKIPPED,
        runId: run.id,
        message: "Regras nao atendidas. Execucao registrada como SKIPPED.",
        details: { evaluation },
      };
    }

    const execution = await executeAutomationActions({
      automationName: automation.name,
      executionMode: automation.executionMode,
      provider: automation.provider,
      actions: automation.actions,
      runtimeContext: {
        manual: input.manual ?? false,
        metrics: input.metrics || {},
        scope: automation.scopes.map((scope) => ({
          entityType: scope.entityType,
          entityId: scope.entityId,
        })),
      },
    });

    await finalizeAutomationRun({
      runId: run.id,
      automationId: automation.id,
      status: execution.status,
      output: {
        evaluation,
        execution,
      } as Prisma.InputJsonValue,
    });

    return {
      ok: true,
      status: execution.status,
      runId: run.id,
      message: execution.message,
      details: {
        evaluation,
        execution,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha inesperada ao executar automacao.";

    await finalizeAutomationRun({
      runId: run.id,
      automationId: automation.id,
      status: AutomationRunStatus.FAILED,
      errorMessage: message,
      output: {
        error: message,
      },
    });

    return {
      ok: false,
      status: AutomationRunStatus.FAILED,
      runId: run.id,
      message,
    };
  }
}

export async function runDueAutomations(referenceDate: Date = new Date()) {
  const dueAutomations = await listDueAutomations(referenceDate);
  const results: AutomationRunResult[] = [];

  for (const automation of dueAutomations) {
    const result = await runAutomationById(automation.id, { manual: false });
    results.push(result);
  }

  return {
    processed: dueAutomations.length,
    results,
  };
}
