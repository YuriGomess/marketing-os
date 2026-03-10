import { getMetaInsights } from "@/lib/integrations/meta/reports";

export async function getMetaReportAction(params: Record<string, unknown>) {
  const report = await getMetaInsights({
    accountId: typeof params.accountId === "string" ? params.accountId : undefined,
    datePreset:
      typeof params.datePreset === "string"
        ? params.datePreset
        : typeof params.dateFrom === "string"
          ? "maximum"
          : "last_7d",
  });

  return {
    ok: true,
    data: report,
  };
}

