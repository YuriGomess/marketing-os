import { adsAgentPrompt } from "@/lib/agents/ads/prompt";
import { adsTools } from "@/lib/agents/ads/tools";
import { defaultMetaPerformanceThresholds } from "@/lib/analysis/meta/performance";
import { prisma } from "@/lib/prisma";

export const ADS_AGENT_SLUG = "ads-agent";

const DEFAULT_EXECUTION_MODE = "READ_ONLY" as const;

const DEFAULT_THRESHOLDS: Record<string, number> = {
  ctrLowThreshold: defaultMetaPerformanceThresholds.ctrLowThreshold,
  cpcHighThreshold: defaultMetaPerformanceThresholds.cpcHighThreshold,
  spendNoResultThreshold: defaultMetaPerformanceThresholds.spendNoResultThreshold,
  minSpendForEvaluation: defaultMetaPerformanceThresholds.minSpendForEvaluation,
  minImpressionsForEvaluation: defaultMetaPerformanceThresholds.minImpressionsForEvaluation,
};

function normalizeExecutionMode(value?: string | null): "READ_ONLY" | "SUGGEST_ONLY" | "CONFIRM_BEFORE_ACTION" {
  if (value === "SUGGEST_ONLY" || value === "CONFIRM_BEFORE_ACTION") {
    return value;
  }
  return "READ_ONLY";
}

export type AdsAgentConfigView = {
  agent: {
    id: string;
    name: string;
    slug: string;
    type: string;
    isActive: boolean;
  };
  config: {
    systemPrompt: string;
    strategicContext: string | null;
    executionMode: "READ_ONLY" | "SUGGEST_ONLY" | "CONFIRM_BEFORE_ACTION";
    modelName: string | null;
    temperature: number | null;
  };
  tools: Array<{ toolName: string; isEnabled: boolean }>;
  thresholds: Array<{ key: string; value: number }>;
};

export async function ensureAdsAgentSetup(): Promise<void> {
  const agent = await prisma.agent.upsert({
    where: { slug: ADS_AGENT_SLUG },
    create: {
      name: "Ads Agent",
      slug: ADS_AGENT_SLUG,
      type: "ADS",
      isActive: true,
    },
    update: {
      name: "Ads Agent",
      type: "ADS",
    },
  });

  await prisma.agentConfig.upsert({
    where: { agentId: agent.id },
    create: {
      agentId: agent.id,
      systemPrompt: adsAgentPrompt,
      strategicContext: null,
      executionMode: DEFAULT_EXECUTION_MODE,
      modelName: process.env.OPENAI_MODEL?.trim() || null,
      temperature: 0.2,
    },
    update: {},
  });

  for (const tool of adsTools) {
    await prisma.agentTool.upsert({
      where: {
        agentId_toolName: {
          agentId: agent.id,
          toolName: tool.name,
        },
      },
      create: {
        agentId: agent.id,
        toolName: tool.name,
        isEnabled: true,
      },
      update: {},
    });
  }

  for (const [key, value] of Object.entries(DEFAULT_THRESHOLDS)) {
    await prisma.agentThreshold.upsert({
      where: {
        agentId_key: {
          agentId: agent.id,
          key,
        },
      },
      create: {
        agentId: agent.id,
        key,
        value,
      },
      update: {},
    });
  }
}

export async function getAdsAgentConfigView(): Promise<AdsAgentConfigView> {
  await ensureAdsAgentSetup();

  const agent = await prisma.agent.findUnique({
    where: { slug: ADS_AGENT_SLUG },
    include: {
      config: true,
      tools: {
        orderBy: { toolName: "asc" },
      },
      thresholds: {
        orderBy: { key: "asc" },
      },
    },
  });

  if (!agent || !agent.config) {
    throw new Error("Nao foi possivel carregar configuracao do Ads Agent.");
  }

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      type: agent.type,
      isActive: agent.isActive,
    },
    config: {
      systemPrompt: agent.config.systemPrompt,
      strategicContext: agent.config.strategicContext,
      executionMode: normalizeExecutionMode(agent.config.executionMode),
      modelName: agent.config.modelName,
      temperature: agent.config.temperature,
    },
    tools: agent.tools.map((tool) => ({
      toolName: tool.toolName,
      isEnabled: tool.isEnabled,
    })),
    thresholds: agent.thresholds.map((threshold) => ({
      key: threshold.key,
      value: threshold.value,
    })),
  };
}

export async function updateAdsAgentConfig(input: {
  isActive?: boolean;
  systemPrompt?: string;
  strategicContext?: string | null;
  executionMode?: "READ_ONLY" | "SUGGEST_ONLY" | "CONFIRM_BEFORE_ACTION";
  modelName?: string | null;
  temperature?: number | null;
}): Promise<AdsAgentConfigView> {
  await ensureAdsAgentSetup();

  const agent = await prisma.agent.findUnique({
    where: { slug: ADS_AGENT_SLUG },
    include: { config: true },
  });

  if (!agent || !agent.config) {
    throw new Error("Ads Agent nao encontrado.");
  }

  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      isActive: typeof input.isActive === "boolean" ? input.isActive : agent.isActive,
    },
  });

  await prisma.agentConfig.update({
    where: { agentId: agent.id },
    data: {
      systemPrompt:
        typeof input.systemPrompt === "string" && input.systemPrompt.trim().length > 0
          ? input.systemPrompt
          : agent.config.systemPrompt,
      strategicContext:
        input.strategicContext === undefined
          ? agent.config.strategicContext
          : input.strategicContext,
      executionMode: input.executionMode ?? agent.config.executionMode,
      modelName: input.modelName === undefined ? agent.config.modelName : input.modelName,
      temperature:
        input.temperature === undefined ? agent.config.temperature : input.temperature,
    },
  });

  return getAdsAgentConfigView();
}

export async function updateAdsAgentTools(
  tools: Array<{ toolName: string; isEnabled: boolean }>,
): Promise<Array<{ toolName: string; isEnabled: boolean }>> {
  await ensureAdsAgentSetup();

  const agent = await prisma.agent.findUnique({
    where: { slug: ADS_AGENT_SLUG },
  });

  if (!agent) {
    throw new Error("Ads Agent nao encontrado.");
  }

  for (const tool of tools) {
    await prisma.agentTool.upsert({
      where: {
        agentId_toolName: {
          agentId: agent.id,
          toolName: tool.toolName,
        },
      },
      create: {
        agentId: agent.id,
        toolName: tool.toolName,
        isEnabled: tool.isEnabled,
      },
      update: {
        isEnabled: tool.isEnabled,
      },
    });
  }

  const updated = await prisma.agentTool.findMany({
    where: { agentId: agent.id },
    orderBy: { toolName: "asc" },
  });

  return updated.map((tool) => ({ toolName: tool.toolName, isEnabled: tool.isEnabled }));
}

export async function updateAdsAgentThresholds(
  thresholds: Array<{ key: string; value: number }>,
): Promise<Array<{ key: string; value: number }>> {
  await ensureAdsAgentSetup();

  const agent = await prisma.agent.findUnique({
    where: { slug: ADS_AGENT_SLUG },
  });

  if (!agent) {
    throw new Error("Ads Agent nao encontrado.");
  }

  for (const threshold of thresholds) {
    await prisma.agentThreshold.upsert({
      where: {
        agentId_key: {
          agentId: agent.id,
          key: threshold.key,
        },
      },
      create: {
        agentId: agent.id,
        key: threshold.key,
        value: threshold.value,
      },
      update: {
        value: threshold.value,
      },
    });
  }

  const updated = await prisma.agentThreshold.findMany({
    where: { agentId: agent.id },
    orderBy: { key: "asc" },
  });

  return updated.map((threshold) => ({ key: threshold.key, value: threshold.value }));
}

export async function getAdsAgentRuntimeSettings() {
  const view = await getAdsAgentConfigView();
  const enabledToolNames = new Set(
    view.tools.filter((tool) => tool.isEnabled).map((tool) => tool.toolName),
  );

  const thresholdMap = view.thresholds.reduce<Record<string, number>>((acc, threshold) => {
    acc[threshold.key] = threshold.value;
    return acc;
  }, {});

  return {
    isActive: view.agent.isActive,
    systemPrompt: view.config.systemPrompt,
    strategicContext: view.config.strategicContext,
    executionMode: view.config.executionMode,
    modelName: view.config.modelName,
    temperature: view.config.temperature,
    enabledToolNames,
    thresholds: {
      ctrLowThreshold: thresholdMap.ctrLowThreshold,
      cpcHighThreshold: thresholdMap.cpcHighThreshold,
      spendNoResultThreshold: thresholdMap.spendNoResultThreshold,
      minSpendForEvaluation: thresholdMap.minSpendForEvaluation,
      minImpressionsForEvaluation: thresholdMap.minImpressionsForEvaluation,
    },
  };
}
