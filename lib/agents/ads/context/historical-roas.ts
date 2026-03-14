import { getMetaInsightsAction } from "@/lib/actions/ads/get-meta-insights";
import { aggregateRows } from "@/lib/agents/ads/context/shared";
import type { MetaInsightRichRow } from "@/lib/agents/ads/context/types";

type HistoricalWindow = 7 | 14 | 30 | 60 | 180;

const windows: HistoricalWindow[] = [7, 14, 30, 60, 180];

function toInput(params: Record<string, unknown>) {
  return {
    accountId: typeof params.accountId === "string" ? params.accountId : undefined,
    accountName: typeof params.accountName === "string" ? params.accountName : undefined,
    clientName: typeof params.clientName === "string" ? params.clientName : undefined,
    clientId: typeof params.clientId === "string" ? params.clientId : undefined,
    limit: typeof params.limit === "number" ? params.limit : 100,
  };
}

export async function getMetaHistoricalRoasContextAction(params: Record<string, unknown>) {
  const input = toInput(params);

  const results = await Promise.all(
    windows.map(async (days) => {
      const response = await getMetaInsightsAction({
        accountId: input.accountId,
        accountName: input.accountName,
        clientName: input.clientName,
        clientId: input.clientId,
        level: "campaign",
        days,
        limit: input.limit,
      });

      if (!response.ok) {
        return {
          days,
          ok: false as const,
          error: response.error || "Falha ao calcular ROAS historico.",
        };
      }

      const rows = ((response.data as { rows?: unknown[] })?.rows || []) as MetaInsightRichRow[];
      const totals = aggregateRows(rows);
      const hasEnoughData = rows.length > 0 && totals.spend > 0;

      return {
        days,
        ok: true as const,
        hasEnoughData,
        spend: totals.spend,
        conversionValue: totals.actions.conversionValue,
        purchases: totals.actions.purchases,
        roas: totals.derived.roas,
        note: hasEnoughData
          ? null
          : "Dados insuficientes para calcular ROAS de forma confiavel nessa janela.",
      };
    }),
  );

  const ordered = results
    .filter((item): item is Extract<(typeof results)[number], { ok: true }> => item.ok)
    .sort((a, b) => a.days - b.days);

  const comparisons = ordered.map((current, index) => {
    const prev = ordered[index - 1];
    if (!prev) {
      return {
        days: current.days,
        roas: current.roas,
        deltaVsPrevious: null,
      };
    }

    const deltaVsPrevious = prev.roas > 0 ? Number((((current.roas - prev.roas) / prev.roas) * 100).toFixed(2)) : null;

    return {
      days: current.days,
      roas: current.roas,
      deltaVsPrevious,
    };
  });

  return {
    ok: true,
    data: {
      account: input,
      windows: results,
      comparisons,
      guidance:
        "Compare janelas curtas (7/14) com longas (60/180) para separar ruido tatico de tendencia estrutural.",
    },
  };
}
