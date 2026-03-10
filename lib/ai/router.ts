import type { AgentRouteResult } from "./types";

const adsKeywords = [
  "meta",
  "ads",
  "campanha",
  "campanhas",
  "anunc",
  "ncio",
  "anuncio",
  "anuncios",
  "anúncio",
  "anúncios",
  "criativ",
  "criativo",
  "criativos",
  "relat",
  "desempenho",
  "metrica",
  "resultado",
  "conta",
  "overview",
  "visao",
  "contas do meta",
  "minhas contas",
  "quais contas",
  "sincronizar contas",
  "importar contas",
  "ctr",
  "cpa",
  "roas",
  "conjunto",
] as const;

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function routeAgent(message: string): AgentRouteResult {
  const normalizedMessage = normalizeForMatch(message);
  const matchedTerms = adsKeywords.filter((term) =>
    normalizedMessage.includes(normalizeForMatch(term)),
  );

  if (matchedTerms.length > 0) {
    return {
      agent: "ads",
      confidence: "high",
      matchedTerms: [...matchedTerms],
    };
  }

  return {
    agent: "ads",
    confidence: "fallback",
    matchedTerms: [],
  };
}
