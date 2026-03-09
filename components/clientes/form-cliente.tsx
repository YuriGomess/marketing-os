"use client";

import { FormEvent, useState } from "react";

type FormClienteProps = {
  onCreated?: () => void | Promise<void>;
};

export function FormCliente({ onCreated }: FormClienteProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSalvando(true);

    try {
      const response = await fetch("/api/clientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          email: email || null,
          telefone: telefone || null,
          empresa: empresa || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Falha ao criar cliente.");
      }

      setNome("");
      setEmail("");
      setTelefone("");
      setEmpresa("");

      if (onCreated) {
        await onCreated();
      }
    } catch (submitError) {
      setErro(
        submitError instanceof Error
          ? submitError.message
          : "Erro inesperado ao salvar cliente.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted">
        Novo Cliente
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-muted">Nome</span>
          <input
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-slate-100 outline-none ring-accent/50 transition focus:ring"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            required
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Email</span>
          <input
            type="email"
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-slate-100 outline-none ring-accent/50 transition focus:ring"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Telefone</span>
          <input
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-slate-100 outline-none ring-accent/50 transition focus:ring"
            value={telefone}
            onChange={(event) => setTelefone(event.target.value)}
          />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-medium text-muted">Empresa</span>
          <input
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm text-slate-100 outline-none ring-accent/50 transition focus:ring"
            value={empresa}
            onChange={(event) => setEmpresa(event.target.value)}
          />
        </label>
      </div>

      {erro ? <p className="text-sm text-red-400">{erro}</p> : null}

      <button
        type="submit"
        disabled={salvando}
        className="rounded bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {salvando ? "Salvando..." : "Salvar Cliente"}
      </button>
    </form>
  );
}
