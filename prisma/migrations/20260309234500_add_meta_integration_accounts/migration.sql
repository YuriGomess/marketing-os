-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegrationAccount" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "clientId" TEXT,
  "provider" "IntegrationProvider" NOT NULL DEFAULT 'META_ADS',
  "externalAccountId" TEXT NOT NULL,
  "externalAccountName" TEXT NOT NULL,
  "currency" TEXT,
  "timezoneName" TEXT,
  "status" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationAccount_integrationId_externalAccountId_key"
ON "IntegrationAccount"("integrationId", "externalAccountId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationAccount_clientId_idx"
ON "IntegrationAccount"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationAccount_provider_idx"
ON "IntegrationAccount"("provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationAccount_isActive_idx"
ON "IntegrationAccount"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationAccount_isDefault_idx"
ON "IntegrationAccount"("isDefault");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationAccount_externalAccountName_idx"
ON "IntegrationAccount"("externalAccountName");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntegrationAccount"
  ADD CONSTRAINT "IntegrationAccount_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "IntegrationAccount"
  ADD CONSTRAINT "IntegrationAccount_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
