-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('ADS');

-- CreateEnum
CREATE TYPE "AgentExecutionMode" AS ENUM ('READ_ONLY', 'SUGGEST_ONLY', 'CONFIRM_BEFORE_ACTION');

-- CreateTable
CREATE TABLE "Agent" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "AgentType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConfig" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "strategicContext" TEXT,
  "executionMode" "AgentExecutionMode" NOT NULL DEFAULT 'READ_ONLY',
  "modelName" TEXT,
  "temperature" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTool" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgentTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentThreshold" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgentThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_slug_key" ON "Agent"("slug");

-- CreateIndex
CREATE INDEX "Agent_type_idx" ON "Agent"("type");

-- CreateIndex
CREATE INDEX "Agent_isActive_idx" ON "Agent"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConfig_agentId_key" ON "AgentConfig"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentTool_agentId_toolName_key" ON "AgentTool"("agentId", "toolName");

-- CreateIndex
CREATE INDEX "AgentTool_toolName_idx" ON "AgentTool"("toolName");

-- CreateIndex
CREATE UNIQUE INDEX "AgentThreshold_agentId_key_key" ON "AgentThreshold"("agentId", "key");

-- CreateIndex
CREATE INDEX "AgentThreshold_key_idx" ON "AgentThreshold"("key");

-- AddForeignKey
ALTER TABLE "AgentConfig" ADD CONSTRAINT "AgentConfig_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTool" ADD CONSTRAINT "AgentTool_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentThreshold" ADD CONSTRAINT "AgentThreshold_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
