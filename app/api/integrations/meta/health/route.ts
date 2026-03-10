import { runMetaHealthCheck } from "@/lib/integrations/meta/health";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId") || undefined;
    const health = await runMetaHealthCheck(accountId);

    return Response.json({
      ok: true,
      provider: "META_ADS",
      configured: health.configured,
      accountIdPresent: health.accountIdPresent,
      apiReachable: health.apiReachable,
      accountReadable: health.accountReadable,
      message: health.message,
      foundEnv: health.foundEnv,
      missingEnv: health.missingEnv,
      errorCategory: health.errorCategory,
      apiAccountsCount: health.apiAccountsCount,
      syncedAccountsCount: health.syncedAccountsCount,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        provider: "META_ADS",
        message:
          error instanceof Error
            ? error.message
            : "Falha inesperada no endpoint de health Meta.",
      },
      { status: 500 },
    );
  }
}
