import {
  AutomationActionType,
  AutomationExecutionMode,
  AutomationRunStatus,
  Prisma,
} from "@prisma/client";

export type ExecutableAction = {
  actionType: AutomationActionType;
  payload: Prisma.JsonValue | null;
  sortOrder: number;
};

export type ExecutorInput = {
  automationName: string;
  executionMode: AutomationExecutionMode;
  provider: string;
  actions: ExecutableAction[];
  runtimeContext: {
    manual: boolean;
    metrics: Record<string, unknown>;
    scope: Array<{ entityType: string; entityId: string }>;
  };
};

export type ExecutorResult = {
  status: AutomationRunStatus;
  message: string;
  actionResults: Array<{
    actionType: AutomationActionType;
    status: "executed" | "simulated" | "skipped";
    detail: string;
  }>;
};

function parsePayload(payload: Prisma.JsonValue | null): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return payload as Record<string, unknown>;
}

function executeAction(
  action: ExecutableAction,
  mode: AutomationExecutionMode,
): { status: "executed" | "simulated" | "skipped"; detail: string } {
  const payload = parsePayload(action.payload);

  if (mode === AutomationExecutionMode.SIMULATE) {
    return {
      status: "simulated",
      detail: `Acao ${action.actionType} simulada (modo SIMULATE).`,
    };
  }

  if (action.actionType === AutomationActionType.ADJUST_BUDGET) {
    return {
      status: "skipped",
      detail:
        "Ajuste de budget ainda nao esta conectado ao provider nesta V1. Acao registrada como pendente de executor especifico.",
    };
  }

  if (action.actionType === AutomationActionType.CALL_WEBHOOK) {
    const url = typeof payload.url === "string" ? payload.url : "(url nao informada)";
    return {
      status: "executed",
      detail: `Webhook preparado para envio: ${url}.`,
    };
  }

  if (action.actionType === AutomationActionType.NOTIFY) {
    const channel = typeof payload.channel === "string" ? payload.channel : "interno";
    return {
      status: "executed",
      detail: `Notificacao registrada no canal ${channel}.`,
    };
  }

  if (action.actionType === AutomationActionType.CREATE_TASK) {
    const title = typeof payload.title === "string" ? payload.title : "Revisar automacao";
    return {
      status: "executed",
      detail: `Tarefa interna criada (virtual): ${title}.`,
    };
  }

  if (action.actionType === AutomationActionType.CREATE_ALERT) {
    const message =
      typeof payload.message === "string"
        ? payload.message
        : "Alerta interno disparado por automacao.";
    return {
      status: "executed",
      detail: message,
    };
  }

  return {
    status: "skipped",
    detail: `Acao ${action.actionType} sem executor implementado nesta etapa.`,
  };
}

export async function executeAutomationActions(
  input: ExecutorInput,
): Promise<ExecutorResult> {
  const actionResults = input.actions.map((action) => ({
    actionType: action.actionType,
    ...executeAction(action, input.executionMode),
  }));

  const hasFailure = actionResults.some((result) => result.status === "skipped");
  const hasExecuted = actionResults.some(
    (result) => result.status === "executed" || result.status === "simulated",
  );

  const status = hasFailure
    ? hasExecuted
      ? AutomationRunStatus.PARTIAL_SUCCESS
      : AutomationRunStatus.SKIPPED
    : AutomationRunStatus.SUCCESS;

  return {
    status,
    message: `Automacao '${input.automationName}' processada com ${actionResults.length} acoes.`,
    actionResults,
  };
}
