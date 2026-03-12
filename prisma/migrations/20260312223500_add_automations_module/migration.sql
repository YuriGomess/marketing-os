-- CreateEnum
CREATE TYPE "AutomationProvider" AS ENUM ('META_ADS', 'WHATSAPP', 'GOOGLE_ADS', 'TIKTOK_ADS', 'FINANCE', 'CRM', 'TASKS', 'NOTIFICATIONS', 'INTERNAL');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('CRON', 'MANUAL', 'EVENT');

-- CreateEnum
CREATE TYPE "AutomationExecutionMode" AS ENUM ('SIMULATE', 'LIVE');

-- CreateEnum
CREATE TYPE "AutomationOperator" AS ENUM ('GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL', 'EQUAL', 'NOT_EQUAL', 'CONTAINS', 'NOT_CONTAINS');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('NOTIFY', 'ADJUST_BUDGET', 'CREATE_TASK', 'CREATE_ALERT', 'CALL_WEBHOOK');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AutomationScopeEntityType" AS ENUM ('CLIENT', 'INTEGRATION', 'ACCOUNT', 'CAMPAIGN', 'ADSET', 'AD', 'CONTACT', 'DEAL', 'TASK', 'CHANNEL', 'CUSTOM');

-- CreateTable
CREATE TABLE "Automation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "provider" "AutomationProvider" NOT NULL,
  "triggerType" "AutomationTriggerType" NOT NULL DEFAULT 'CRON',
  "cronExpression" TEXT NOT NULL,
  "executionMode" "AutomationExecutionMode" NOT NULL DEFAULT 'SIMULATE',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDraft" BOOLEAN NOT NULL DEFAULT false,
  "draftPayload" JSONB,
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationScope" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "entityType" "AutomationScopeEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AutomationScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL,
  "operator" "AutomationOperator" NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationAction" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "actionType" "AutomationActionType" NOT NULL,
  "payload" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AutomationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "status" "AutomationRunStatus" NOT NULL DEFAULT 'PENDING',
  "input" JSONB,
  "output" JSONB,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Automation_provider_idx" ON "Automation"("provider");

-- CreateIndex
CREATE INDEX "Automation_isActive_idx" ON "Automation"("isActive");

-- CreateIndex
CREATE INDEX "Automation_nextRunAt_idx" ON "Automation"("nextRunAt");

-- CreateIndex
CREATE INDEX "Automation_triggerType_idx" ON "Automation"("triggerType");

-- CreateIndex
CREATE INDEX "AutomationScope_automationId_idx" ON "AutomationScope"("automationId");

-- CreateIndex
CREATE INDEX "AutomationScope_entityType_idx" ON "AutomationScope"("entityType");

-- CreateIndex
CREATE INDEX "AutomationRule_automationId_idx" ON "AutomationRule"("automationId");

-- CreateIndex
CREATE INDEX "AutomationRule_metricKey_idx" ON "AutomationRule"("metricKey");

-- CreateIndex
CREATE INDEX "AutomationAction_automationId_idx" ON "AutomationAction"("automationId");

-- CreateIndex
CREATE INDEX "AutomationAction_actionType_idx" ON "AutomationAction"("actionType");

-- CreateIndex
CREATE INDEX "AutomationAction_sortOrder_idx" ON "AutomationAction"("sortOrder");

-- CreateIndex
CREATE INDEX "AutomationRun_automationId_idx" ON "AutomationRun"("automationId");

-- CreateIndex
CREATE INDEX "AutomationRun_status_idx" ON "AutomationRun"("status");

-- CreateIndex
CREATE INDEX "AutomationRun_startedAt_idx" ON "AutomationRun"("startedAt");

-- AddForeignKey
ALTER TABLE "AutomationScope" ADD CONSTRAINT "AutomationScope_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAction" ADD CONSTRAINT "AutomationAction_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
