import type {
  CampaignAnalysisType,
  CampaignTypeDecision,
  MetaInsightRichRow,
} from "@/lib/agents/ads/context/types";

type ClassifyInput = {
  userMessage?: string;
  rows?: MetaInsightRichRow[];
};

const objectiveSignals: Record<CampaignAnalysisType, string[]> = {
  ECOMMERCE: ["sales", "conversions", "catalog_sales", "app_promotions"],
  WHATSAPP: ["messages", "lead_generation"],
  FOLLOWERS: ["engagement", "awareness", "traffic"],
};

const keywordSignals: Record<CampaignAnalysisType, string[]> = {
  ECOMMERCE: ["ecommerce", "e-commerce", "shop", "loja", "produto", "carrinho", "checkout", "roas"],
  WHATSAPP: ["whatsapp", "mensagem", "conversa", "inbox", "chat"],
  FOLLOWERS: ["seguidores", "followers", "instagram", "perfil", "engajamento"],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pushEvidence(bucket: string[], label: string, score: number) {
  if (score > 0) {
    bucket.push(`${label}: +${score}`);
  }
}

export function classifyCampaignAnalysisType(input: ClassifyInput): CampaignTypeDecision {
  const rows = input.rows || [];
  const message = normalize(input.userMessage || "");

  const scores: Record<CampaignAnalysisType, number> = {
    ECOMMERCE: 0,
    WHATSAPP: 0,
    FOLLOWERS: 0,
  };

  const evidence: string[] = [];

  for (const type of Object.keys(keywordSignals) as CampaignAnalysisType[]) {
    const keywordHit = keywordSignals[type].filter((term) => message.includes(normalize(term))).length;
    scores[type] += keywordHit * 2;
    pushEvidence(evidence, `keywords_${type.toLowerCase()}`, keywordHit * 2);
  }

  const objectives = rows
    .map((row) => normalize(row.objective || ""))
    .filter(Boolean);

  for (const type of Object.keys(objectiveSignals) as CampaignAnalysisType[]) {
    const objectiveHit = objectives.filter((objective) =>
      objectiveSignals[type].some((term) => objective.includes(term)),
    ).length;
    scores[type] += objectiveHit * 3;
    pushEvidence(evidence, `objectives_${type.toLowerCase()}`, objectiveHit * 3);
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.purchases += row.actions?.purchases || 0;
      acc.messages += row.actions?.messagingConversations || 0;
      acc.followers += row.actions?.followers || 0;
      acc.profileVisits += row.actions?.profileVisits || 0;
      return acc;
    },
    { purchases: 0, messages: 0, followers: 0, profileVisits: 0 },
  );

  if (totals.purchases > 0) {
    scores.ECOMMERCE += 3;
    evidence.push("signal_purchases: +3");
  }

  if (totals.messages > 0) {
    scores.WHATSAPP += 3;
    evidence.push("signal_messages: +3");
  }

  if (totals.followers > 0 || totals.profileVisits > 0) {
    scores.FOLLOWERS += 2;
    evidence.push("signal_followers_profile: +2");
  }

  const ordered = (Object.entries(scores) as Array<[CampaignAnalysisType, number]>).sort((a, b) => b[1] - a[1]);
  const winner = ordered[0][0];
  const winnerScore = ordered[0][1];
  const secondScore = ordered[1][1];

  const spread = winnerScore - secondScore;
  const confidenceRaw = winnerScore <= 0 ? 0.3 : Math.min(0.96, 0.5 + spread / 10 + winnerScore / 30);
  const confidence = Number(confidenceRaw.toFixed(2));

  const lowConfidence = confidence < 0.65;
  const reason = lowConfidence
    ? `Classificacao com baixa confianca (${confidence}) por sinais mistos.`
    : `Classificacao ${winner} com confianca ${confidence} baseada em objetivo, naming e sinais de metricas.`;

  return {
    type: winner,
    confidence,
    reason,
    evidence,
  };
}
