"use client";

import { useEffect, useMemo, useState } from "react";
import { AutomationAICreator } from "@/components/automations/automation-ai-creator";
import type { AutomationDraft } from "@/lib/automations/draft";

type AutomationProvider =
  | "META_ADS"
  | "WHATSAPP"
  | "GOOGLE_ADS"
  | "TIKTOK_ADS"
  | "FINANCE"
  | "CRM"
  | "TASKS"
  | "NOTIFICATIONS"
  | "INTERNAL";

type AutomationTriggerType = "CRON" | "MANUAL" | "EVENT";
type AutomationExecutionMode = "SIMULATE" | "LIVE";
type AutomationOperator =
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "EQUAL"
  | "NOT_EQUAL"
  | "CONTAINS"
  | "NOT_CONTAINS";
type AutomationActionType =
  | "NOTIFY"
  | "ADJUST_BUDGET"
  | "CREATE_TASK"
  | "CREATE_ALERT"
  | "CALL_WEBHOOK";

type AutomationScopeEntityType =
  | "CLIENT"
  | "INTEGRATION"
  | "ACCOUNT"
  | "CAMPAIGN"
  | "ADSET"
  | "AD"
  | "CONTACT"
  | "DEAL"
  | "TASK"
  | "CHANNEL"
  | "CUSTOM";

type AutomationRecord = {
  id: string;
  name: string;
  description: string | null;
  provider: AutomationProvider;
  triggerType: AutomationTriggerType;
  cronExpression: string;
  executionMode: AutomationExecutionMode;
  isActive: boolean;
  isDraft: boolean;
  draftPayload: unknown;
  lastRunAt: string | null;
  nextRunAt: string | null;
  updatedAt: string;
  scopes: Array<{
    id: string;
    entityType: AutomationScopeEntityType;
    entityId: string;
    metadata: unknown;
  }>;
  rules: Array<{
    id: string;
    metricKey: string;
    operator: AutomationOperator;
    value: number;
    metadata: unknown;
  }>;
  actions: Array<{
    id: string;
    actionType: AutomationActionType;
    payload: unknown;
    sortOrder: number;
  }>;
  runs: Array<{
    id: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    errorMessage: string | null;
  }>;
  _count?: {
    runs: number;
  };
};

type ScopeForm = {
  entityType: AutomationScopeEntityType;
  entityId: string;
  metadataText: string;
};

type RuleForm = {
  metricKey: string;
  operator: AutomationOperator;
  value: string;
  metadataText: string;
};

type ActionForm = {
  actionType: AutomationActionType;
  sortOrder: string;
  payloadText: string;
};

type AutomationFormState = {
  id: string | null;
  name: string;
  description: string;
  provider: AutomationProvider;
  triggerType: AutomationTriggerType;
  cronExpression: string;
  executionMode: AutomationExecutionMode;
  isActive: boolean;
  isDraft: boolean;
  draftPayloadText: string;
  scopes: ScopeForm[];
  rules: RuleForm[];
  actions: ActionForm[];
};

type RunResponse = {
  ok: boolean;
  data?: {
    ok: boolean;
    status: string;
    message: string;
    runId?: string;
    details?: unknown;
  };
  error?: string;
};

const PROVIDERS: AutomationProvider[] = [
  "META_ADS",
  "WHATSAPP",
  "GOOGLE_ADS",
  "TIKTOK_ADS",
  "FINANCE",
  "CRM",
  "TASKS",
  "NOTIFICATIONS",
  "INTERNAL",
];

const TRIGGER_TYPES: AutomationTriggerType[] = ["CRON", "MANUAL", "EVENT"];
const EXECUTION_MODES: AutomationExecutionMode[] = ["SIMULATE", "LIVE"];
const SCOPE_TYPES: AutomationScopeEntityType[] = [
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
];
const OPERATORS: AutomationOperator[] = [
  "GREATER_THAN",
  "GREATER_THAN_OR_EQUAL",
  "LESS_THAN",
  "LESS_THAN_OR_EQUAL",
  "EQUAL",
  "NOT_EQUAL",
  "CONTAINS",
  "NOT_CONTAINS",
];
const ACTION_TYPES: AutomationActionType[] = [
  "NOTIFY",
  "ADJUST_BUDGET",
  "CREATE_TASK",
  "CREATE_ALERT",
  "CALL_WEBHOOK",
];

function prettyDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleString("pt-BR");
}

function serializeJson(input: unknown): string {
  if (input === null || input === undefined) return "";

  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return "";
  }
}

function parseJsonText(input: string): unknown {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error("JSON invalido em metadata/payload.");
  }
}

function emptyForm(): AutomationFormState {
  return {
    id: null,
    name: "",
    description: "",
    provider: "META_ADS",
    triggerType: "CRON",
    cronExpression: "0 */2 * * *",
    executionMode: "SIMULATE",
    isActive: true,
    isDraft: false,
    draftPayloadText: "",
    scopes: [{ entityType: "ACCOUNT", entityId: "", metadataText: "" }],
    rules: [{ metricKey: "roas", operator: "GREATER_THAN", value: "3", metadataText: "" }],
    actions: [
      {
        actionType: "NOTIFY",
        sortOrder: "0",
        payloadText: '{\n  "channel": "interno",\n  "message": "Condicao atendida"\n}',
      },
    ],
  };
}

function formFromRecord(record: AutomationRecord): AutomationFormState {
  return {
    id: record.id,
    name: record.name,
    description: record.description || "",
    provider: record.provider,
    triggerType: record.triggerType,
    cronExpression: record.cronExpression,
    executionMode: record.executionMode,
    isActive: record.isActive,
    isDraft: record.isDraft,
    draftPayloadText: serializeJson(record.draftPayload),
    scopes:
      record.scopes.length > 0
        ? record.scopes.map((scope) => ({
            entityType: scope.entityType,
            entityId: scope.entityId,
            metadataText: serializeJson(scope.metadata),
          }))
        : [{ entityType: "ACCOUNT", entityId: "", metadataText: "" }],
    rules:
      record.rules.length > 0
        ? record.rules.map((rule) => ({
            metricKey: rule.metricKey,
            operator: rule.operator,
            value: String(rule.value),
            metadataText: serializeJson(rule.metadata),
          }))
        : [{ metricKey: "", operator: "GREATER_THAN", value: "0", metadataText: "" }],
    actions:
      record.actions.length > 0
        ? record.actions.map((action) => ({
            actionType: action.actionType,
            sortOrder: String(action.sortOrder),
            payloadText: serializeJson(action.payload),
          }))
        : [{ actionType: "NOTIFY", sortOrder: "0", payloadText: "" }],
  };
}

function formFromAIDraft(draft: AutomationDraft): AutomationFormState {
  return {
    id: null,
    name: draft.name,
    description: draft.description || "",
    provider: draft.provider,
    triggerType: draft.triggerType,
    cronExpression: draft.cronExpression,
    executionMode: draft.executionMode,
    isActive: draft.isActive,
    isDraft: true,
    draftPayloadText: serializeJson(draft.draftPayload),
    scopes:
      draft.scopes.length > 0
        ? draft.scopes.map((scope) => ({
            entityType: scope.entityType,
            entityId: scope.entityId,
            metadataText: serializeJson(scope.metadata),
          }))
        : [{ entityType: "ACCOUNT", entityId: "", metadataText: "" }],
    rules:
      draft.rules.length > 0
        ? draft.rules.map((rule) => ({
            metricKey: rule.metricKey,
            operator: rule.operator,
            value: String(rule.value),
            metadataText: serializeJson(rule.metadata),
          }))
        : [{ metricKey: "", operator: "GREATER_THAN", value: "0", metadataText: "" }],
    actions:
      draft.actions.length > 0
        ? draft.actions.map((action, index) => ({
            actionType: action.actionType,
            sortOrder: String(
              typeof action.sortOrder === "number" ? action.sortOrder : index,
            ),
            payloadText: serializeJson(action.payload),
          }))
        : [{ actionType: "NOTIFY", sortOrder: "0", payloadText: "" }],
  };
}

function applyTemplate(templateId: string): AutomationFormState {
  const base = emptyForm();

  if (templateId === "paused-notify") {
    return {
      ...base,
      name: "Meta Ads: campanhas pausadas e notificar",
      description: "Monitora campanhas pausadas e envia alerta interno.",
      cronExpression: "0 */4 * * *",
      rules: [
        {
          metricKey: "pausedCampaigns",
          operator: "GREATER_THAN",
          value: "0",
          metadataText: "",
        },
      ],
      actions: [
        {
          actionType: "NOTIFY",
          sortOrder: "0",
          payloadText: '{\n  "channel": "interno",\n  "message": "Existem campanhas pausadas para revisar"\n}',
        },
      ],
    };
  }

  if (templateId === "delivery-notify") {
    return {
      ...base,
      name: "Meta Ads: saldo/entrega em risco",
      description: "Detecta queda de entrega ou saldo critico e notifica.",
      cronExpression: "*/30 * * * *",
      rules: [
        {
          metricKey: "deliveryHealth",
          operator: "LESS_THAN",
          value: "70",
          metadataText: '{\n  "scale": "0-100"\n}',
        },
      ],
      actions: [
        {
          actionType: "CREATE_ALERT",
          sortOrder: "0",
          payloadText: '{\n  "message": "Entrega em risco ou saldo baixo"\n}',
        },
      ],
    };
  }

  if (templateId === "increase-budget") {
    return {
      ...base,
      name: "Meta Ads: aumentar orçamento quando ROAS > X",
      description: "Quando a performance passa do alvo, prepara ajuste de budget.",
      executionMode: "SIMULATE",
      cronExpression: "0 */6 * * *",
      rules: [
        {
          metricKey: "roas",
          operator: "GREATER_THAN",
          value: "3",
          metadataText: "",
        },
      ],
      actions: [
        {
          actionType: "ADJUST_BUDGET",
          sortOrder: "0",
          payloadText: '{\n  "deltaPercent": 10\n}',
        },
        {
          actionType: "NOTIFY",
          sortOrder: "1",
          payloadText: '{\n  "channel": "interno",\n  "message": "Ajuste de budget sugerido por ROAS"\n}',
        },
      ],
    };
  }

  if (templateId === "internal-task") {
    return {
      ...base,
      name: "Meta Ads: criar tarefa interna por condicao",
      description: "Cria tarefa operacional para o time quando regra dispara.",
      cronExpression: "0 9 * * 1-5",
      rules: [
        {
          metricKey: "cpc",
          operator: "GREATER_THAN",
          value: "4",
          metadataText: "",
        },
      ],
      actions: [
        {
          actionType: "CREATE_TASK",
          sortOrder: "0",
          payloadText: '{\n  "title": "Revisar campanhas com CPC alto",\n  "priority": "high"\n}',
        },
      ],
    };
  }

  return base;
}

export function AutomationsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [items, setItems] = useState<AutomationRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AutomationFormState>(emptyForm());
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadAutomations() {
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/automations", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao carregar automacoes.");
      }

      setItems(payload.data || []);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao carregar automacoes.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAutomations();
  }, []);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [items],
  );

  function openNew() {
    setForm(emptyForm());
    setFormOpen(true);
    setFeedback(null);
  }

  function openEdit(item: AutomationRecord) {
    setForm(formFromRecord(item));
    setFormOpen(true);
    setFeedback(null);
  }

  function closeForm() {
    setFormOpen(false);
  }

  function updateScope(index: number, patch: Partial<ScopeForm>) {
    setForm((prev) => {
      const next = [...prev.scopes];
      next[index] = { ...next[index], ...patch };
      return { ...prev, scopes: next };
    });
  }

  function updateRule(index: number, patch: Partial<RuleForm>) {
    setForm((prev) => {
      const next = [...prev.rules];
      next[index] = { ...next[index], ...patch };
      return { ...prev, rules: next };
    });
  }

  function updateAction(index: number, patch: Partial<ActionForm>) {
    setForm((prev) => {
      const next = [...prev.actions];
      next[index] = { ...next[index], ...patch };
      return { ...prev, actions: next };
    });
  }

  async function saveAutomation() {
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        name: form.name,
        description: form.description.trim() || null,
        provider: form.provider,
        triggerType: form.triggerType,
        cronExpression: form.cronExpression,
        executionMode: form.executionMode,
        isActive: form.isActive,
        isDraft: form.isDraft,
        draftPayload: parseJsonText(form.draftPayloadText),
        scopes: form.scopes
          .map((scope) => ({
            entityType: scope.entityType,
            entityId: scope.entityId,
            metadata: parseJsonText(scope.metadataText),
          }))
          .filter((scope) => scope.entityId.trim().length > 0),
        rules: form.rules
          .map((rule) => ({
            metricKey: rule.metricKey,
            operator: rule.operator,
            value: Number(rule.value),
            metadata: parseJsonText(rule.metadataText),
          }))
          .filter((rule) => rule.metricKey.trim().length > 0),
        actions: form.actions.map((action, index) => ({
          actionType: action.actionType,
          sortOrder: Number(action.sortOrder) || index,
          payload: parseJsonText(action.payloadText),
        })),
      };

      const isEdit = Boolean(form.id);
      const endpoint = isEdit ? `/api/automations/${form.id}` : "/api/automations";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json();

      if (!response.ok || !responsePayload?.ok) {
        throw new Error(responsePayload?.error || "Falha ao salvar automacao.");
      }

      setFeedback({
        type: "success",
        message: isEdit
          ? "Automacao atualizada com sucesso."
          : "Automacao criada com sucesso.",
      });
      setFormOpen(false);
      await loadAutomations();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Falha ao salvar automacao.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleAutomation(id: string) {
    setFeedback(null);

    try {
      const response = await fetch(`/api/automations/${id}/toggle`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao alternar status da automacao.");
      }

      setFeedback({ type: "success", message: "Status da automacao atualizado." });
      await loadAutomations();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao alternar automacao.",
      });
    }
  }

  async function runNow(id: string) {
    setRunningId(id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/automations/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as RunResponse;

      if (!response.ok || !payload?.ok || !payload.data) {
        throw new Error(payload?.error || "Falha ao executar automacao.");
      }

      setFeedback({
        type: payload.data.ok ? "success" : "error",
        message: `${payload.data.message} (status: ${payload.data.status})`,
      });
      await loadAutomations();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao executar automacao.",
      });
    } finally {
      setRunningId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Automações</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Crie regras com cron, escopo e ações para operar campanhas e rotinas internas.
            A estrutura ja nasce pronta para evolucao multi-provider e criacao assistida por IA.
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <AutomationAICreator
            onCreated={loadAutomations}
            onFeedback={setFeedback}
            onEditLater={(draft) => {
              setForm(formFromAIDraft(draft));
              setFormOpen(true);
              setFeedback({
                type: "success",
                message: "Draft da IA carregado no formulario para ajustes.",
              });
            }}
          />

          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            Nova automacao
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-panel p-4">
        <button
          type="button"
          onClick={() => {
            setForm(applyTemplate("paused-notify"));
            setFormOpen(true);
          }}
          className="rounded-lg border border-border bg-panel-strong px-3 py-1.5 text-xs text-slate-100"
        >
          Template: campanhas pausadas + notificar
        </button>
        <button
          type="button"
          onClick={() => {
            setForm(applyTemplate("delivery-notify"));
            setFormOpen(true);
          }}
          className="rounded-lg border border-border bg-panel-strong px-3 py-1.5 text-xs text-slate-100"
        >
          Template: saldo/entrega + notificar
        </button>
        <button
          type="button"
          onClick={() => {
            setForm(applyTemplate("increase-budget"));
            setFormOpen(true);
          }}
          className="rounded-lg border border-border bg-panel-strong px-3 py-1.5 text-xs text-slate-100"
        >
          Template: aumentar budget por ROAS
        </button>
        <button
          type="button"
          onClick={() => {
            setForm(applyTemplate("internal-task"));
            setFormOpen(true);
          }}
          className="rounded-lg border border-border bg-panel-strong px-3 py-1.5 text-xs text-slate-100"
        >
          Template: criar tarefa interna
        </button>
      </div>

      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border bg-panel p-6 text-sm text-muted">
          Carregando automacoes...
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-panel p-8 text-center">
          <h2 className="text-lg font-medium text-slate-100">Nenhuma automacao cadastrada</h2>
          <p className="mt-2 text-sm text-muted">
            Comece por uma automacao simples com cron e acao de notificacao.
          </p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Criar primeira automacao
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {sortedItems.map((item) => {
            const latestRun = item.runs[0];
            const runCount = item._count?.runs ?? item.runs.length;

            return (
              <article key={item.id} className="rounded-2xl border border-border bg-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-slate-100">{item.name}</h2>
                    {item.description ? (
                      <p className="text-sm text-muted">{item.description}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full border border-border bg-panel-strong px-2 py-1">
                        provider: {item.provider}
                      </span>
                      <span className="rounded-full border border-border bg-panel-strong px-2 py-1">
                        trigger: {item.triggerType}
                      </span>
                      <span className="rounded-full border border-border bg-panel-strong px-2 py-1">
                        cron: {item.cronExpression}
                      </span>
                      <span className="rounded-full border border-border bg-panel-strong px-2 py-1">
                        mode: {item.executionMode}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-1 ${
                          item.isActive
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                            : "border-zinc-500/50 bg-zinc-500/10 text-zinc-300"
                        }`}
                      >
                        {item.isActive ? "ativa" : "inativa"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void runNow(item.id)}
                      disabled={runningId === item.id}
                      className="rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                    >
                      {runningId === item.id ? "Executando..." : "Executar agora"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleAutomation(item.id)}
                      className="rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100"
                    >
                      {item.isActive ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-lg border border-border bg-panel-strong px-3 py-2">
                    <p className="text-xs text-muted">Ultima execucao</p>
                    <p className="mt-1 text-slate-100">{prettyDate(item.lastRunAt)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-panel-strong px-3 py-2">
                    <p className="text-xs text-muted">Proxima execucao</p>
                    <p className="mt-1 text-slate-100">{prettyDate(item.nextRunAt)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-panel-strong px-3 py-2">
                    <p className="text-xs text-muted">Ultimo status</p>
                    <p className="mt-1 text-slate-100">{latestRun?.status || "-"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-panel-strong px-3 py-2">
                    <p className="text-xs text-muted">Runs registrados</p>
                    <p className="mt-1 text-slate-100">{runCount}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {formOpen ? (
        <div className="rounded-2xl border border-border bg-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-100">
                {form.id ? "Editar automacao" : "Nova automacao"}
              </h3>
              <p className="mt-1 text-sm text-muted">
                Configure trigger, escopo, regras e acoes para o runner de automacoes.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-slate-200"
            >
              Fechar
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted">Nome</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted">Provider</span>
              <select
                value={form.provider}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, provider: event.target.value as AutomationProvider }))
                }
                className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted">Descricao</span>
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted">Trigger</span>
              <select
                value={form.triggerType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, triggerType: event.target.value as AutomationTriggerType }))
                }
                className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
              >
                {TRIGGER_TYPES.map((trigger) => (
                  <option key={trigger} value={trigger}>
                    {trigger}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted">Modo de execucao</span>
              <select
                value={form.executionMode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, executionMode: event.target.value as AutomationExecutionMode }))
                }
                className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
              >
                {EXECUTION_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted">Expressao cron</span>
              <input
                value={form.cronExpression}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cronExpression: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
                placeholder="Ex: 0 */4 * * *"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                className="h-4 w-4"
              />
              Ativa
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={form.isDraft}
                onChange={(event) => setForm((prev) => ({ ...prev, isDraft: event.target.checked }))}
                className="h-4 w-4"
              />
              Salvar como draft
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs text-muted">Draft payload (JSON opcional)</span>
              <textarea
                rows={4}
                value={form.draftPayloadText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, draftPayloadText: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 font-mono text-xs text-slate-100"
                placeholder='{"naturalLanguageRequest": "...", "preview": {...}}'
              />
            </label>
          </div>

          <div className="mt-6 space-y-3 rounded-xl border border-border bg-panel-strong p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-100">Escopo</h4>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    scopes: [...prev.scopes, { entityType: "ACCOUNT", entityId: "", metadataText: "" }],
                  }))
                }
                className="rounded-lg border border-border px-2 py-1 text-xs"
              >
                + Escopo
              </button>
            </div>
            {form.scopes.map((scope, index) => (
              <div key={`scope-${index}`} className="grid gap-2 md:grid-cols-3">
                <select
                  value={scope.entityType}
                  onChange={(event) =>
                    updateScope(index, { entityType: event.target.value as AutomationScopeEntityType })
                  }
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                >
                  {SCOPE_TYPES.map((scopeType) => (
                    <option key={scopeType} value={scopeType}>
                      {scopeType}
                    </option>
                  ))}
                </select>
                <input
                  value={scope.entityId}
                  onChange={(event) => updateScope(index, { entityId: event.target.value })}
                  placeholder="entityId"
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                />
                <input
                  value={scope.metadataText}
                  onChange={(event) => updateScope(index, { metadataText: event.target.value })}
                  placeholder='metadata JSON (opcional)'
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-border bg-panel-strong p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-100">Regras</h4>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    rules: [
                      ...prev.rules,
                      { metricKey: "", operator: "GREATER_THAN", value: "0", metadataText: "" },
                    ],
                  }))
                }
                className="rounded-lg border border-border px-2 py-1 text-xs"
              >
                + Regra
              </button>
            </div>
            {form.rules.map((rule, index) => (
              <div key={`rule-${index}`} className="grid gap-2 md:grid-cols-4">
                <input
                  value={rule.metricKey}
                  onChange={(event) => updateRule(index, { metricKey: event.target.value })}
                  placeholder="metricKey (ex: roas)"
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                />
                <select
                  value={rule.operator}
                  onChange={(event) =>
                    updateRule(index, { operator: event.target.value as AutomationOperator })
                  }
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                >
                  {OPERATORS.map((operator) => (
                    <option key={operator} value={operator}>
                      {operator}
                    </option>
                  ))}
                </select>
                <input
                  value={rule.value}
                  onChange={(event) => updateRule(index, { value: event.target.value })}
                  placeholder="valor"
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                />
                <input
                  value={rule.metadataText}
                  onChange={(event) => updateRule(index, { metadataText: event.target.value })}
                  placeholder='metadata JSON (opcional)'
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-border bg-panel-strong p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-100">Acoes</h4>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    actions: [
                      ...prev.actions,
                      {
                        actionType: "NOTIFY",
                        sortOrder: String(prev.actions.length),
                        payloadText: "",
                      },
                    ],
                  }))
                }
                className="rounded-lg border border-border px-2 py-1 text-xs"
              >
                + Acao
              </button>
            </div>
            {form.actions.map((action, index) => (
              <div key={`action-${index}`} className="grid gap-2 md:grid-cols-3">
                <select
                  value={action.actionType}
                  onChange={(event) =>
                    updateAction(index, { actionType: event.target.value as AutomationActionType })
                  }
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                >
                  {ACTION_TYPES.map((actionType) => (
                    <option key={actionType} value={actionType}>
                      {actionType}
                    </option>
                  ))}
                </select>
                <input
                  value={action.sortOrder}
                  onChange={(event) => updateAction(index, { sortOrder: event.target.value })}
                  placeholder="ordem"
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                />
                <input
                  value={action.payloadText}
                  onChange={(event) => updateAction(index, { payloadText: event.target.value })}
                  placeholder='payload JSON (opcional)'
                  className="rounded-lg border border-border bg-panel px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveAutomation()}
              disabled={saving}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {saving ? "Salvando..." : form.id ? "Salvar alteracoes" : "Criar automacao"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-border px-4 py-2 text-sm text-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
