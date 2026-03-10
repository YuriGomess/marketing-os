-- Create enums (idempotent)
DO $$ BEGIN
  CREATE TYPE "IntegrationProvider" AS ENUM (
    'META_ADS',
    'GOOGLE_ADS',
    'TIKTOK_ADS',
    'GOOGLE_ANALYTICS',
    'KOMMO',
    'WHATSAPP',
    'SHOPIFY',
    'YAMPI',
    'INTERNAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IntegrationStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ERROR',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AIMessageRole" AS ENUM (
    'SYSTEM',
    'USER',
    'ASSISTANT',
    'TOOL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AIActionStatus" AS ENUM (
    'SUCCESS',
    'ERROR',
    'PENDING',
    'CONFIRMED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable Integration
CREATE TABLE IF NOT EXISTS "Integration" (
  "id" TEXT NOT NULL,
  "clientId" TEXT,
  "provider" "IntegrationProvider" NOT NULL,
  "accountName" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "status" "IntegrationStatus" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable IntegrationCredential
CREATE TABLE IF NOT EXISTS "IntegrationCredential" (
  "id" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "tokenType" TEXT,
  "scope" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable AIConversation
CREATE TABLE IF NOT EXISTS "AIConversation" (
  "id" TEXT NOT NULL,
  "title" TEXT,
  "clientId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable AIMessage
CREATE TABLE IF NOT EXISTS "AIMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "AIMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "toolName" TEXT,
  "toolCallId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable AIActionLog
CREATE TABLE IF NOT EXISTS "AIActionLog" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT,
  "provider" "IntegrationProvider",
  "action" TEXT NOT NULL,
  "status" "AIActionStatus" NOT NULL,
  "input" JSONB,
  "output" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIActionLog_pkey" PRIMARY KEY ("id")
);

-- Unique index
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationCredential_integrationId_key"
ON "IntegrationCredential"("integrationId");

-- Indexes
CREATE INDEX IF NOT EXISTS "Integration_clientId_idx" ON "Integration"("clientId");
CREATE INDEX IF NOT EXISTS "Integration_provider_idx" ON "Integration"("provider");
CREATE INDEX IF NOT EXISTS "Integration_status_idx" ON "Integration"("status");

CREATE INDEX IF NOT EXISTS "AIConversation_clientId_idx" ON "AIConversation"("clientId");

CREATE INDEX IF NOT EXISTS "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");
CREATE INDEX IF NOT EXISTS "AIMessage_role_idx" ON "AIMessage"("role");

CREATE INDEX IF NOT EXISTS "AIActionLog_conversationId_idx" ON "AIActionLog"("conversationId");
CREATE INDEX IF NOT EXISTS "AIActionLog_provider_idx" ON "AIActionLog"("provider");
CREATE INDEX IF NOT EXISTS "AIActionLog_status_idx" ON "AIActionLog"("status");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "Integration"
  ADD CONSTRAINT "Integration_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "IntegrationCredential"
  ADD CONSTRAINT "IntegrationCredential_integrationId_fkey"
  FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AIConversation"
  ADD CONSTRAINT "AIConversation_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AIMessage"
  ADD CONSTRAINT "AIMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AIActionLog"
  ADD CONSTRAINT "AIActionLog_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
