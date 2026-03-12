"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  meta?: {
    agent?: string;
    accountUsed?: string;
    toolsUsed?: string[];
  };
};

type IAApiResponse = {
  ok?: boolean;
  data?: {
    agent?: string;
    message?: string;
    accountUsed?: {
      accountId?: string;
      accountName?: string;
    } | null;
    toolsUsed?: Array<{ tool?: string }>;
  };
  error?: string;
};

type IAAccountUsed = {
  accountId?: string;
  accountName?: string;
} | null | undefined;

const QUICK_SUGGESTIONS = [
  "Analise a conta Dueto Alianca",
  "Quais campanhas estao piores?",
  "Quais contas do Meta estao disponiveis?",
  "Me de um resumo da conta Dueto Alianca",
] as const;

const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".csv", ".xlsx", ".txt", ".docx"];
const ACCEPT_ATTR = ".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.txt,.docx";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatAccountLabel(account: IAAccountUsed): string | undefined {
  if (!account) return undefined;
  if (account.accountName && account.accountId) {
    return `${account.accountName} (${account.accountId})`;
  }
  return account.accountName || account.accountId || undefined;
}

function isAcceptedFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function IChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const canSend = useMemo(() => {
    return (input.trim().length > 0 || Boolean(attachment)) && !isSending;
  }, [input, attachment, isSending]);

  async function sendMessage(messageText: string) {
    const normalizedMessage = messageText.trim();
    if (!normalizedMessage && !attachment) return;

    setError(null);
    setIsSending(true);

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: normalizedMessage || "[Anexo enviado sem texto]",
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      let response: Response;
      if (attachment) {
        const formData = new FormData();
        formData.append("message", normalizedMessage || "Analise este anexo.");
        formData.append("attachment", attachment);
        response = await fetch("/api/ia", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/ia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: normalizedMessage }),
        });
      }

      const payload = (await response.json().catch(() => null)) as IAApiResponse | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Falha ao consultar a IA.");
      }

      const accountLabel = formatAccountLabel(payload.data?.accountUsed || null);
      const toolsUsed = (payload.data?.toolsUsed || [])
        .map((tool) => tool.tool)
        .filter((tool): tool is string => Boolean(tool));

      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: payload.data?.message || "Sem resposta da IA.",
        createdAt: Date.now(),
        meta: {
          agent: payload.data?.agent,
          accountUsed: accountLabel,
          toolsUsed,
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setInput("");
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Nao foi possivel enviar a mensagem para a IA.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleQuickSuggestion(suggestion: string) {
    setInput(suggestion);
    void sendMessage(suggestion);
  }

  function handleSelectFile(file: File | null) {
    if (!file) return;

    if (!isAcceptedFile(file)) {
      setError("Formato de arquivo nao suportado nesta etapa.");
      return;
    }

    setError(null);
    setAttachment(file);
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-3xl font-semibold tracking-tight text-white">Ads Copilot</h2>
        <p className="mt-2 text-sm text-muted">
          Converse com a IA para consultar contas, performance e recomendacoes operacionais.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-panel p-4 md:p-6">
        <div className="flex h-[70vh] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-panel-strong p-4 text-sm text-muted">
                Escreva uma pergunta sobre Meta Ads ou use as sugestoes rapidas abaixo para comecar.
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm md:max-w-[75%] ${
                    message.role === "user"
                      ? "bg-accent/20 text-slate-100"
                      : "border border-border bg-panel-strong text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.role === "assistant" && message.meta ? (
                    <div className="mt-2 space-y-1 text-xs text-muted">
                      {message.meta.agent ? <p>Agente: {message.meta.agent}</p> : null}
                      {message.meta.accountUsed ? <p>Conta: {message.meta.accountUsed}</p> : null}
                      {message.meta.toolsUsed && message.meta.toolsUsed.length > 0 ? (
                        <p>Tools: {message.meta.toolsUsed.join(", ")}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {isSending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border bg-panel-strong px-4 py-3 text-sm text-muted">
                  IA processando...
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>

          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleQuickSuggestion(suggestion)}
                  disabled={isSending}
                  className="rounded-full border border-border bg-panel-strong px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {attachment ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-panel-strong px-3 py-2 text-xs text-slate-200">
                <span className="truncate pr-2">Anexo: {attachment.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="rounded bg-slate-700 px-2 py-1 text-[11px] hover:bg-slate-600"
                >
                  Remover
                </button>
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    if (canSend) {
                      void sendMessage(input);
                    }
                  }
                }}
                placeholder="Pergunte sobre contas, campanhas, alertas ou desempenho..."
                className="flex-1 rounded-xl border border-border bg-panel-strong px-4 py-3 text-sm text-slate-100 outline-none ring-accent/40 placeholder:text-muted focus:ring-2"
                disabled={isSending}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={(event) => handleSelectFile(event.target.files?.[0] || null)}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                className="rounded-xl border border-border bg-panel-strong px-3 py-2 text-xs text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                title="Anexar arquivo"
              >
                Anexar
              </button>

              <button
                type="button"
                onClick={() => void sendMessage(input)}
                disabled={!canSend}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-slate-950 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? "Enviando..." : "Enviar"}
              </button>
            </div>

            <p className="text-[11px] text-muted">
              Formatos aceitos: {ACCEPTED_EXTENSIONS.join(", ")}
            </p>

            {error ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
