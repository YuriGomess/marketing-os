"use client";

import { useEffect, useState } from "react";
import { FormCliente } from "@/components/clientes/form-cliente";

type Cliente = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa: string | null;
  status: string;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarClientes() {
    setCarregando(true);
    setErro(null);

    try {
      const res = await fetch("/api/clientes", { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Falha ao carregar clientes.");
      }

      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao buscar clientes.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-white">Clientes</h2>
        <p className="mt-2 text-sm text-muted">
          Gestao de carteira de clientes, status e historico de relacionamento.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-6">
        <button
          onClick={() => setMostrarFormulario((state) => !state)}
          className="mb-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Novo Cliente
        </button>

        {mostrarFormulario ? (
          <div className="mb-6 rounded-xl border border-border bg-panel-strong p-4">
            <FormCliente
              onCreated={async () => {
                setMostrarFormulario(false);
                await carregarClientes();
              }}
            />
          </div>
        ) : null}

        {erro ? (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <p>{erro}</p>
            <p className="mt-1 text-xs text-red-200/80">
              Se estiver em ambiente local, confirme o tunel SSH do banco ativo na porta 5433.
            </p>
            <button
              onClick={() => carregarClientes()}
              className="mt-3 rounded bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/30"
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        {carregando ? (
          <p className="text-sm text-muted">Carregando clientes...</p>
        ) : clientes.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum cliente cadastrado ainda. Use a rota <code>/api/clientes</code>
            {" "}
            com metodo <code>POST</code> para inserir o primeiro registro.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-3 py-3 font-medium">Nome</th>
                  <th className="px-3 py-3 font-medium">Empresa</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Telefone</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-border/60 text-slate-200">
                    <td className="px-3 py-3">{cliente.nome}</td>
                    <td className="px-3 py-3">{cliente.empresa ?? "-"}</td>
                    <td className="px-3 py-3">{cliente.email ?? "-"}</td>
                    <td className="px-3 py-3">{cliente.telefone ?? "-"}</td>
                    <td className="px-3 py-3 capitalize">{cliente.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
