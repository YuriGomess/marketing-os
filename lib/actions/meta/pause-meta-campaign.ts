export async function pauseMetaCampaignAction(params: Record<string, unknown>) {
  const campaignId = typeof params.campaignId === "string" ? params.campaignId : "";

  if (!campaignId) {
    return {
      ok: false,
      error: "campaignId e obrigatorio para pausar campanha.",
    };
  }

  return {
    ok: false,
    error:
      "Acao destrutiva desativada nesta etapa. A pausa de campanhas sera habilitada em uma fase futura com confirmacao explicita.",
  };
}

