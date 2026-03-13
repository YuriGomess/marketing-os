-- CreateEnum
CREATE TYPE "WhatsappProvider" AS ENUM ('EVOLUTION', 'META_CLOUD', 'OFFICIAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "WhatsappInstanceStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'QRCODE', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "WhatsappConversationStatus" AS ENUM ('OPEN', 'ARCHIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WhatsappMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsappMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'UNKNOWN');

-- CreateTable
CREATE TABLE "WhatsappInstance" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" "WhatsappProvider" NOT NULL,
  "externalInstanceId" TEXT,
  "status" "WhatsappInstanceStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "phoneNumber" TEXT,
  "qrCode" TEXT,
  "webhookUrl" TEXT,
  "metadata" JSONB,
  "connectedAt" TIMESTAMP(3),
  "disconnectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsappInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappContact" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "externalContactId" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsappContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappConversation" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "externalConversationId" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  "status" "WhatsappConversationStatus" NOT NULL DEFAULT 'OPEN',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsappConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMessage" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "contactId" TEXT,
  "externalMessageId" TEXT,
  "direction" "WhatsappMessageDirection" NOT NULL,
  "messageType" "WhatsappMessageType" NOT NULL DEFAULT 'TEXT',
  "textContent" TEXT,
  "mediaUrl" TEXT,
  "rawPayload" JSONB,
  "sentAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappEventLog" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WhatsappEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappInstance_provider_idx" ON "WhatsappInstance"("provider");

-- CreateIndex
CREATE INDEX "WhatsappInstance_status_idx" ON "WhatsappInstance"("status");

-- CreateIndex
CREATE INDEX "WhatsappInstance_externalInstanceId_idx" ON "WhatsappInstance"("externalInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappContact_instanceId_externalContactId_key" ON "WhatsappContact"("instanceId", "externalContactId");

-- CreateIndex
CREATE INDEX "WhatsappContact_instanceId_idx" ON "WhatsappContact"("instanceId");

-- CreateIndex
CREATE INDEX "WhatsappContact_phone_idx" ON "WhatsappContact"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappConversation_instanceId_contactId_key" ON "WhatsappConversation"("instanceId", "contactId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_instanceId_idx" ON "WhatsappConversation"("instanceId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_contactId_idx" ON "WhatsappConversation"("contactId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_lastMessageAt_idx" ON "WhatsappConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "WhatsappConversation_status_idx" ON "WhatsappConversation"("status");

-- CreateIndex
CREATE INDEX "WhatsappMessage_instanceId_idx" ON "WhatsappMessage"("instanceId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_conversationId_idx" ON "WhatsappMessage"("conversationId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_contactId_idx" ON "WhatsappMessage"("contactId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_externalMessageId_idx" ON "WhatsappMessage"("externalMessageId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_direction_idx" ON "WhatsappMessage"("direction");

-- CreateIndex
CREATE INDEX "WhatsappMessage_createdAt_idx" ON "WhatsappMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsappEventLog_instanceId_idx" ON "WhatsappEventLog"("instanceId");

-- CreateIndex
CREATE INDEX "WhatsappEventLog_eventType_idx" ON "WhatsappEventLog"("eventType");

-- CreateIndex
CREATE INDEX "WhatsappEventLog_createdAt_idx" ON "WhatsappEventLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WhatsappContact" ADD CONSTRAINT "WhatsappContact_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConversation" ADD CONSTRAINT "WhatsappConversation_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappConversation" ADD CONSTRAINT "WhatsappConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsappContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsappConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsappContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappEventLog" ADD CONSTRAINT "WhatsappEventLog_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WhatsappInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
