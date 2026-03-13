"use client";

import { useEffect, useMemo, useState } from "react";

type InstanceStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "QRCODE"
  | "CONNECTED"
  | "ERROR";

type WhatsAppInstance = {
  id: string;
  name: string;
  provider: string;
  status: InstanceStatus;
  externalInstanceId: string | null;
  phoneNumber: string | null;
  qrCode: string | null;
  webhookUrl: string | null;
  updatedAt: string;
  _count?: {
    conversations: number;
    messages: number;
  };
};

type WhatsAppConversation = {
  id: string;
  instanceId: string;
  contactId: string;
  lastMessageAt: string | null;
  unreadCount: number;
  status: string;
  contact: {
    id: string;
    name: string | null;
    phone: string;
  };
  messages: Array<{
    id: string;
    textContent: string | null;
    createdAt: string;
    direction: string;
  }>;
};

type WhatsAppMessage = {
  id: string;
  direction: string;
  messageType: string;
  textContent: string | null;
  mediaUrl: string | null;
  createdAt: string;
};

function prettyDate(input: string | null): string {
  if (!input) return "-";
  return new Date(input).toLocaleString("pt-BR");
}

function statusLabel(status: InstanceStatus): string {
  switch (status) {
    case "CONNECTED":
      return "Conectada";
    case "CONNECTING":
      return "Conectando";
    case "QRCODE":
      return "Aguardando QR";
    case "ERROR":
      return "Erro";
    default:
      return "Desconectada";
  }
}

export function WhatsappPanel() {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [creating, setCreating] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [refreshingQrId, setRefreshingQrId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [newInstanceName, setNewInstanceName] = useState("");
  const [newInstanceWebhook, setNewInstanceWebhook] = useState("");
  const [messageText, setMessageText] = useState("");

  const selectedInstance = useMemo(
    () => instances.find((item) => item.id === selectedInstanceId) || null,
    [instances, selectedInstanceId],
  );

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  async function loadInstances(preserveSelection = true) {
    setLoading(true);

    try {
      const response = await fetch("/api/whatsapp/instances", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao carregar instancias WhatsApp.");
      }

      const list = payload.data as WhatsAppInstance[];
      setInstances(list);

      if (list.length === 0) {
        setSelectedInstanceId(null);
        return;
      }

      if (preserveSelection && selectedInstanceId && list.some((i) => i.id === selectedInstanceId)) {
        return;
      }

      setSelectedInstanceId(list[0].id);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao carregar instancias.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadConversations(instanceId: string | null) {
    if (!instanceId) {
      setConversations([]);
      setSelectedConversationId(null);
      setMessages([]);
      return;
    }

    try {
      const response = await fetch(`/api/whatsapp/conversations?instanceId=${encodeURIComponent(instanceId)}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao carregar conversas.");
      }

      const list = payload.data as WhatsAppConversation[];
      setConversations(list);
      if (list.length === 0) {
        setSelectedConversationId(null);
        setMessages([]);
        return;
      }

      const nextConversationId =
        selectedConversationId && list.some((item) => item.id === selectedConversationId)
          ? selectedConversationId
          : list[0].id;
      setSelectedConversationId(nextConversationId);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao carregar conversas WhatsApp.",
      });
    }
  }

  async function loadMessages(conversationId: string | null) {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/messages`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao carregar mensagens.");
      }

      setMessages(payload.data as WhatsAppMessage[]);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao carregar mensagens.",
      });
    }
  }

  useEffect(() => {
    void loadInstances(false);
  }, []);

  useEffect(() => {
    void loadConversations(selectedInstanceId);
  }, [selectedInstanceId]);

  useEffect(() => {
    void loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  async function createInstance() {
    if (!newInstanceName.trim()) {
      setFeedback({ type: "error", message: "Informe o nome da instancia." });
      return;
    }

    setCreating(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/whatsapp/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newInstanceName.trim(),
          webhookUrl: newInstanceWebhook.trim() || null,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao criar instancia.");
      }

      setFeedback({
        type: payload?.warning ? "error" : "success",
        message: payload?.warning
          ? `Instancia criada localmente. ${payload.warning}`
          : "Instancia criada com sucesso.",
      });
      setNewInstanceName("");
      setNewInstanceWebhook("");
      await loadInstances(false);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao criar instancia WhatsApp.",
      });
    } finally {
      setCreating(false);
    }
  }

  async function connectInstance(instanceId: string) {
    setConnectingId(instanceId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/whatsapp/instances/${instanceId}/connect`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao conectar instancia.");
      }

      setFeedback({ type: "success", message: "Conexao iniciada. QR atualizado." });
      await loadInstances(true);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao conectar instancia.",
      });
    } finally {
      setConnectingId(null);
    }
  }

  async function refreshQr(instanceId: string) {
    setRefreshingQrId(instanceId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/whatsapp/instances/${instanceId}/qrcode`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao atualizar QR code.");
      }

      await loadInstances(true);
      setFeedback({ type: "success", message: "QR/status atualizado com sucesso." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar QR code.",
      });
    } finally {
      setRefreshingQrId(null);
    }
  }

  async function sendMessage() {
    if (!selectedConversationId) {
      setFeedback({ type: "error", message: "Selecione uma conversa para enviar mensagem." });
      return;
    }

    if (!messageText.trim()) {
      setFeedback({ type: "error", message: "Digite uma mensagem." });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/whatsapp/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText.trim() }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao enviar mensagem.");
      }

      setMessageText("");
      setFeedback({ type: "success", message: "Mensagem enviada com sucesso." });
      await loadMessages(selectedConversationId);
      await loadConversations(selectedInstanceId);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao enviar mensagem WhatsApp.",
      });
    } finally {
      setSending(false);
    }
  }

  async function deleteInstance(instanceId: string, instanceName: string) {
    const confirmed = window.confirm(
      `Deseja excluir a instancia \"${instanceName}\"? Esta acao remove conversas e mensagens vinculadas.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(instanceId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/whatsapp/instances/${instanceId}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Falha ao excluir instancia.");
      }

      setFeedback({ type: "success", message: "Instancia excluida com sucesso." });
      setSelectedInstanceId((current) => (current === instanceId ? null : current));
      await loadInstances(false);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao excluir instancia WhatsApp.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">WhatsApp</h1>
        <p className="mt-2 text-sm text-muted">
          Conecte instancias por QR code, receba mensagens via webhook e opere uma inbox basica.
        </p>
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

      <div className="rounded-2xl border border-border bg-panel p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Nova instancia</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            value={newInstanceName}
            onChange={(event) => setNewInstanceName(event.target.value)}
            placeholder="Nome da instancia (ex: atendimento-principal)"
            className="rounded-xl border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100"
          />
          <input
            value={newInstanceWebhook}
            onChange={(event) => setNewInstanceWebhook(event.target.value)}
            placeholder="Webhook URL (opcional)"
            className="rounded-xl border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="button"
            onClick={() => void createInstance()}
            disabled={creating}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {creating ? "Criando..." : "Criar instancia"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr_1fr]">
        <aside className="rounded-2xl border border-border bg-panel p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Instancias</h3>

          {loading ? (
            <p className="mt-3 text-sm text-muted">Carregando instancias...</p>
          ) : instances.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhuma instancia criada.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {instances.map((instance) => (
                <button
                  key={instance.id}
                  type="button"
                  onClick={() => setSelectedInstanceId(instance.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left ${
                    selectedInstanceId === instance.id
                      ? "border-accent bg-panel-strong"
                      : "border-border bg-panel"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-100">{instance.name}</p>
                  <p className="mt-1 text-xs text-muted">{statusLabel(instance.status)}</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="rounded-2xl border border-border bg-panel p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Conexao</h3>

          {!selectedInstance ? (
            <p className="mt-3 text-sm text-muted">Selecione uma instancia.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-border bg-panel-strong p-3 text-sm">
                <p className="text-slate-100"><strong>Instancia:</strong> {selectedInstance.name}</p>
                <p className="text-slate-100"><strong>Status:</strong> {statusLabel(selectedInstance.status)}</p>
                <p className="text-slate-100"><strong>Telefone:</strong> {selectedInstance.phoneNumber || "-"}</p>
                <p className="text-slate-100"><strong>Atualizado:</strong> {prettyDate(selectedInstance.updatedAt)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void connectInstance(selectedInstance.id)}
                  disabled={connectingId === selectedInstance.id}
                  className="rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                >
                  {connectingId === selectedInstance.id ? "Conectando..." : "Conectar"}
                </button>
                <button
                  type="button"
                  onClick={() => void refreshQr(selectedInstance.id)}
                  disabled={refreshingQrId === selectedInstance.id}
                  className="rounded-lg border border-border bg-panel-strong px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                >
                  {refreshingQrId === selectedInstance.id ? "Atualizando..." : "Atualizar QR"}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteInstance(selectedInstance.id, selectedInstance.name)}
                  disabled={deletingId === selectedInstance.id}
                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 disabled:opacity-60"
                >
                  {deletingId === selectedInstance.id ? "Excluindo..." : "Excluir"}
                </button>
              </div>

              <div className="rounded-xl border border-border bg-panel-strong p-3">
                <p className="text-xs text-muted">QR code</p>
                {selectedInstance.qrCode ? (
                  selectedInstance.qrCode.startsWith("data:image") ? (
                    <img
                      src={selectedInstance.qrCode}
                      alt="QR Code WhatsApp"
                      className="mt-2 max-h-72 w-auto rounded-lg border border-border"
                    />
                  ) : (
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-panel p-2 text-xs text-slate-200">
                      {selectedInstance.qrCode}
                    </pre>
                  )
                ) : (
                  <p className="mt-2 text-sm text-muted">Sem QR code disponivel.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-panel p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">Inbox</h3>

          {!selectedInstance ? (
            <p className="mt-3 text-sm text-muted">Selecione uma instancia para ver conversas.</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-[16rem_1fr]">
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted">Nenhuma conversa encontrada.</p>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left ${
                        selectedConversationId === conversation.id
                          ? "border-accent bg-panel-strong"
                          : "border-border bg-panel"
                      }`}
                    >
                      <p className="text-sm text-slate-100">
                        {conversation.contact.name || conversation.contact.phone}
                      </p>
                      <p className="text-xs text-muted">
                        {conversation.unreadCount > 0
                          ? `${conversation.unreadCount} nao lidas`
                          : "sem nao lidas"}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-border bg-panel-strong p-3">
                {!selectedConversation ? (
                  <p className="text-sm text-muted">Selecione uma conversa.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="max-h-80 space-y-2 overflow-auto rounded-lg border border-border bg-panel p-3">
                      {messages.length === 0 ? (
                        <p className="text-sm text-muted">Nenhuma mensagem.</p>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                              message.direction === "OUTBOUND"
                                ? "ml-auto bg-accent/20 text-sky-100"
                                : "mr-auto bg-panel-strong text-slate-100"
                            }`}
                          >
                            <p>{message.textContent || `[${message.messageType}]`}</p>
                            <p className="mt-1 text-[10px] text-muted">
                              {prettyDate(message.createdAt)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        placeholder="Digite uma mensagem..."
                        className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => void sendMessage()}
                        disabled={sending}
                        className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                      >
                        {sending ? "Enviando..." : "Enviar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
