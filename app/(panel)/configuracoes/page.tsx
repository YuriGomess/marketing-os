import Link from "next/link";

export default function ConfiguracoesPage() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-white">Configurações</h2>
        <p className="mt-2 text-sm text-muted">
          Preferencias da plataforma, permissoes e configuracoes de ambiente.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-6">
        <h3 className="text-lg font-semibold text-slate-100">Configuração de Agentes</h3>
        <p className="mt-2 text-sm text-muted">
          Edite prompt, tools e thresholds do Ads Agent sem alterar o codigo.
        </p>

        <Link
          href="/configuracoes/agentes"
          className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          Abrir Configuração de Agentes
        </Link>
      </div>
    </section>
  );
}
