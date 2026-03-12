"use client";

import { useEffect, useMemo, useState } from "react";

type ExecutionMode = "READ_ONLY" | "SUGGEST_ONLY" | "CONFIRM_BEFORE_ACTION";

type AgentConfigPayload = {
  agent: {
    id: string;
    name: string;
    slug: string;
    type: string;
    isActive: boolean;
  };
  config: {
    systemPrompt: string;
    strategicContext: string | null;
    executionMode: ExecutionMode;
    modelName: string | null;
    temperature: number | null;
  };
  tools: Array<{ toolName: string; isEnabled: boolean }>;
  thresholds: Array<{ key: string; value: number }>;
};

const THRESHOLD_LABELS: Record<string, string> = {
  ctrLowThreshold: "CTR minimo aceitavel (%)",
  cpcHighThreshold: "CPC maximo aceitavel",
  spendNoResultThreshold: "Gasto sem resultado",
  minSpendForEvaluation: "Gasto minimo para avaliar",
  minImpressionsForEvaluation: "Impressoes minimas para avaliar",
};

export function AdsAgentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [agent, setAgent] = useState<AgentConfigPayload["agent"] | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [strategicContext, setStrategicContext] = useState("");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("READ_ONLY");
  const [modelName, setModelName] = useState("");
  const [temperature, setTemperature] = useState<string>("");
  const [tools, setTools] = useState<Array<{ toolName: string; isEnabled: boolean }>>([]);
  const [thresholds, setThresholds] = useState<Array<{ key: string; value: number }>>([]);

  async function loadConfig() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/agents/ads", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao carregar configuracao do agente.");
      }

      const data = payload.data as AgentConfigPayload;
      setAgent(data.agent);
      setSystemPrompt(data.config.systemPrompt || "");
      setStrategicContext(data.config.strategicContext || "");
      setExecutionMode(data.config.executionMode || "READ_ONLY");
      setModelName(data.config.modelName || "");
      setTemperature(
        typeof data.config.temperature === "number"
          ? String(data.config.temperature)
          : "",
      );
      setTools(data.tools || []);
      setThresholds(data.thresholds || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Erro inesperado ao carregar configuracao.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  const sortedThresholds = useMemo(() => {
    return [...thresholds].sort((a, b) => a.key.localeCompare(b.key));
  }, [thresholds]);

  async function saveAll() {
    if (!agent) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedTemperature = temperature.trim().length > 0 ? Number(temperature) : null;
      if (parsedTemperature !== null && !Number.isFinite(parsedTemperature)) {
        throw new Error("Temperatura invalida. Use numero decimal, ex: 0.2");
      }

      const configRes = await fetch("/api/agents/ads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: agent.isActive,
          systemPrompt,
          strategicContext: strategicContext.trim().length > 0 ? strategicContext : null,
          executionMode,
          modelName: modelName.trim().length > 0 ? modelName : null,
          temperature: parsedTemperature,
        }),
      });
      const configPayload = await configRes.json();
      if (!configRes.ok || !configPayload?.ok) {
        throw new Error(configPayload?.error || "Falha ao salvar configuracao base.");
      }

      const toolsRes = await fetch("/api/agents/ads/tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tools }),
      });
      const toolsPayload = await toolsRes.json();
      if (!toolsRes.ok || !toolsPayload?.ok) {
        throw new Error(toolsPayload?.error || "Falha ao salvar tools.");
      }

      const thresholdsRes = await fetch("/api/agents/ads/thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds }),
      });
      const thresholdsPayload = await thresholdsRes.json();
      if (!thresholdsRes.ok || !thresholdsPayload?.ok) {
        throw new Error(thresholdsPayload?.error || "Falha ao salvar thresholds.");
      }

      setSuccess("Configuracoes do Ads Agent salvas com sucesso.");
      await loadConfig();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro inesperado ao salvar configuracao.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">Agentes</h2>
          <p className="mt-2 text-sm text-muted">
            Configure comportamento, prompt e ferramentas do Ads Agent sem alterar codigo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving || loading || !agent}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar alteracoes"}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      ) : null}

      {loading || !agent ? (
        <div className="rounded-2xl border border-border bg-panel p-6 text-sm text-muted">
          Carregando configuracao do Ads Agent...
        </div>
      ) : (
        <div className="space-y-4">
          <article className="rounded-2xl border border-border bg-panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Identidade do agente</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-muted">Nome</p>
                <p className="mt-1 text-sm text-slate-100">{agent.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Tipo</p>
                <p className="mt-1 text-sm text-slate-100">{agent.type}</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-100">
                <input
                  type="checkbox"
                  checked={agent.isActive}
                  onChange={(event) =>
                    setAgent((prev) =>
                      prev ? { ...prev, isActive: event.target.checked } : prev,
                    )
                  }
                  className="h-4 w-4 rounded border-border bg-panel-strong"
                />
                Agente ativo
              </label>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Prompt base</h3>
            <textarea
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={10}
              className="mt-3 w-full rounded-xl border border-border bg-panel-strong px-3 py-3 text-sm text-slate-100 outline-none ring-accent/40 focus:ring-2"
            />
          </article>

          <article className="rounded-2xl border border-border bg-panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Contexto estrategico</h3>
            <textarea
              value={strategicContext}
              onChange={(event) => setStrategicContext(event.target.value)}
              rows={5}
              placeholder="Ex: Metodo de analise, prioridades por funil, restricoes operacionais..."
              className="mt-3 w-full rounded-xl border border-border bg-panel-strong px-3 py-3 text-sm text-slate-100 outline-none ring-accent/40 placeholder:text-muted focus:ring-2"
            />
          </article>

          <article className="rounded-2xl border border-border bg-panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Modo de execucao</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted">Modo</span>
                <select
                  value={executionMode}
                  onChange={(event) => setExecutionMode(event.target.value as ExecutionMode)}
                  className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
                >
                  <option value="READ_ONLY">read_only</option>
                  <option value="SUGGEST_ONLY">suggest_only</option>
                  <option value="CONFIRM_BEFORE_ACTION">confirm_before_action</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted">Modelo (opcional)</span>
                <input
                  value={modelName}
                  onChange={(event) => setModelName(event.target.value)}
                  className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
                  placeholder="gpt-4.1-mini"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted">Temperatura (opcional)</span>
                <input
                  value={temperature}
                  onChange={(event) => setTemperature(event.target.value)}
                  className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
                  placeholder="0.2"
                />
              </label>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Tools</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {tools.map((tool, index) => (
                <label key={tool.toolName} className="flex items-center gap-2 rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100">
                  <input
                    type="checkbox"
                    checked={tool.isEnabled}
                    onChange={(event) => {
                      const next = [...tools];
                      next[index] = { ...tool, isEnabled: event.target.checked };
                      setTools(next);
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span>{tool.toolName}</span>
                </label>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-panel p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Thresholds</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {sortedThresholds.map((threshold) => (
                <label key={threshold.key} className="space-y-1 text-sm">
                  <span className="text-xs text-muted">{THRESHOLD_LABELS[threshold.key] || threshold.key}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={threshold.value}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      setThresholds((prev) =>
                        prev.map((item) =>
                          item.key === threshold.key && Number.isFinite(parsed)
                            ? { ...item, value: parsed }
                            : item,
                        ),
                      );
                    }}
                    className="w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-slate-100"
                  />
                </label>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
