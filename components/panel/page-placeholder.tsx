type PagePlaceholderProps = {
  title: string;
  description: string;
};

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-6">
        <p className="text-sm text-slate-300">
          Conteudo inicial da area <span className="font-semibold">{title}</span>.
        </p>
        <p className="mt-2 text-sm text-muted">
          Em breve: metricas, filtros e componentes dinamicos.
        </p>
      </div>
    </section>
  );
}
