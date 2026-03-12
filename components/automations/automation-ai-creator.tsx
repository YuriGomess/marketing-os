"use client";

import { useState } from "react";
import type { AutomationDraft, AutomationDraftPreview } from "@/lib/automations/draft";

type DraftApiData = {
  draft: AutomationDraft;
  preview: AutomationDraftPreview;
  issues: string[];
  needsClarification: boolean;
  ambiguities: string[];
  assumptions: string[];
};

type Props = {
  onEditLater: (draft: AutomationDraft) => void;
  onCreated: () => Promise<void> | void;
  onFeedback: (feedback: { type: "success" | "error"; message: string }) => void;
};

export function AutomationAICreator({ onEditLater, onCreated, onFeedback }: Props) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<DraftApiData | null>(null);

  function closePanel() {
    setOpen(false);
    setRequest("");
    setResult(null);
    setLoadingDraft(false);
    setConfirming(false);
  }

  async function generateDraft() {
    if (!request.trim()) {
      onFeedback({ type: "error", message: "Descreva a automacao em linguagem natural." });
      return;
    }

    setLoadingDraft(true);
    setResult(null);

    try {
      const response = await fetch("/api/automations/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok || !payload?.data) {
        throw new Error(payload?.error || "Falha ao gerar draft de automacao.");
      }

      const data = payload.data as DraftApiData;
      setResult(data);

      if (data.needsClarification) {
        onFeedback({
          type: "error",
          message:
            "A IA gerou um draft com ambiguidades. Revise o preview antes de confirmar.",
        });
      } else {
        onFeedback({
          type: "success",
          message: "Preview de automacao gerado com sucesso.",
        });
      }
    } catch (error) {
      onFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao gerar draft com IA.",
      });
    } finally {
      setLoadingDraft(false);
    }
  }

  async function confirmDraft() {
    if (!result?.draft) {
      onFeedback({ type: "error", message: "Gere um draft antes de confirmar." });
      return;
    }

    setConfirming(true);

    try {
      const response = await fetch("/api/automations/ai/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: result.draft, request }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao confirmar automacao.");
      }

      onFeedback({ type: "success", message: "Automacao criada via IA com sucesso." });
      await onCreated();
      closePanel();
    } catch (error) {
      onFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao confirmar draft.",
      });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-xl border border-border bg-panel-strong px-4 py-2 text-sm font-semibold text-slate-100 hover:border-accent/60"
      >
        {open ? "Fechar IA" : "Criar com IA"}
      </button>

      {open ? (
        <div className="w-full rounded-2xl border border-border bg-panel p-4 shadow-xl md:w-[44rem]">
          <h3 className="text-base font-semibold text-slate-100">Automation Agent</h3>
          <p className="mt-1 text-xs text-muted">
            Descreva a automacao em linguagem natural. A IA gera um draft com preview e so salva apos confirmacao.
          </p>

          <textarea
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            rows={5}
            placeholder="Ex: Toda segunda as 8h verifique campanhas pausadas e crie uma tarefa interna."
            className="mt-3 w-full rounded-xl border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100 outline-none ring-accent/40 placeholder:text-muted focus:ring-2"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void generateDraft()}
              disabled={loadingDraft || confirming}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {loadingDraft ? "Gerando..." : "Gerar preview"}
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-lg border border-border px-3 py-2 text-sm text-slate-200"
            >
              Cancelar
            </button>
          </div>

          {result ? (
            <div className="mt-4 space-y-3 rounded-xl border border-border bg-panel-strong p-4 text-sm">
              <h4 className="text-sm font-semibold text-slate-100">Preview</h4>
              <p className="text-slate-200">{result.preview.summary}</p>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted">Nome</p>
                  <p className="text-slate-100">{result.preview.title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Provider</p>
                  <p className="text-slate-100">{result.preview.sections.provider}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Quando roda</p>
                  <p className="text-slate-100">{result.preview.sections.schedule}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Modo de execucao</p>
                  <p className="text-slate-100">{result.preview.sections.mode}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted">Escopo</p>
                <ul className="mt-1 list-disc pl-5 text-slate-200">
                  {result.preview.sections.scope.map((entry) => (
                    <li key={`scope-${entry}`}>{entry}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs text-muted">Condicoes</p>
                <ul className="mt-1 list-disc pl-5 text-slate-200">
                  {result.preview.sections.conditions.map((entry) => (
                    <li key={`condition-${entry}`}>{entry}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs text-muted">Acoes</p>
                <ul className="mt-1 list-disc pl-5 text-slate-200">
                  {result.preview.sections.actions.map((entry) => (
                    <li key={`action-${entry}`}>{entry}</li>
                  ))}
                </ul>
              </div>

              {result.preview.ambiguities.length > 0 ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100">
                  <p className="text-xs font-semibold">Ambiguidades</p>
                  <ul className="mt-1 list-disc pl-5">
                    {result.preview.ambiguities.map((item) => (
                      <li key={`ambiguity-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.preview.warnings.length > 0 ? (
                <div className="rounded-lg border border-zinc-500/40 bg-zinc-500/10 px-3 py-2 text-zinc-200">
                  <p className="text-xs font-semibold">Avisos</p>
                  <ul className="mt-1 list-disc pl-5">
                    {result.preview.warnings.map((item) => (
                      <li key={`warning-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.issues.length > 0 ? (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-red-200">
                  <p className="text-xs font-semibold">Pontos para revisar</p>
                  <ul className="mt-1 list-disc pl-5">
                    {result.issues.map((item) => (
                      <li key={`issue-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void confirmDraft()}
                  disabled={confirming}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                >
                  {confirming ? "Confirmando..." : "Confirmar criacao"}
                </button>
                <button
                  type="button"
                  onClick={() => onEditLater(result.draft)}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-slate-100"
                >
                  Editar depois
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-slate-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
