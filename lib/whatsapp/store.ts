import {
  Prisma,
  WhatsappConversationStatus,
  WhatsappInstanceStatus,
  WhatsappMessageDirection,
  WhatsappMessageType,
  WhatsappProvider,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedWhatsappWebhookEvent } from "@/lib/integrations/whatsapp/types";

function toJsonObjectOrUndefined(value: unknown): Prisma.InputJsonObject | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Prisma.InputJsonObject;
}

function sanitizePhone(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const cleaned = value.replace(/[^0-9+]/g, "");
  return cleaned || null;
}

function parseEventTimestamp(value?: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function toMessageType(value: string | undefined): WhatsappMessageType {
  if (!value) return WhatsappMessageType.UNKNOWN;
  const upper = value.toUpperCase();
  if (upper in WhatsappMessageType) {
    return upper as WhatsappMessageType;
  }

  return WhatsappMessageType.UNKNOWN;
}

function toDirection(value: string | undefined): WhatsappMessageDirection {
  if (value === "OUTBOUND") {
    return WhatsappMessageDirection.OUTBOUND;
  }
  return WhatsappMessageDirection.INBOUND;
}

export async function listWhatsappInstances() {
  return prisma.whatsappInstance.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          conversations: true,
          messages: true,
        },
      },
    },
  });
}

export async function createWhatsappInstance(input: {
  name: string;
  provider?: WhatsappProvider;
  webhookUrl?: string | null;
}) {
  return prisma.whatsappInstance.create({
    data: {
      name: input.name.trim(),
      provider: input.provider ?? WhatsappProvider.EVOLUTION,
      webhookUrl: input.webhookUrl || null,
      status: WhatsappInstanceStatus.DISCONNECTED,
    },
  });
}

export async function getWhatsappInstanceById(id: string) {
  return prisma.whatsappInstance.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          conversations: true,
          messages: true,
        },
      },
    },
  });
}

export async function deleteWhatsappInstanceById(id: string) {
  return prisma.whatsappInstance.delete({
    where: { id },
  });
}

export async function updateWhatsappInstanceConnection(
  id: string,
  input: {
    externalInstanceId?: string | null;
    status?: WhatsappInstanceStatus;
    qrCode?: string | null;
    phoneNumber?: string | null;
    webhookUrl?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const now = new Date();

  return prisma.whatsappInstance.update({
    where: { id },
    data: {
      externalInstanceId:
        input.externalInstanceId !== undefined ? input.externalInstanceId : undefined,
      status: input.status ?? undefined,
      qrCode: input.qrCode !== undefined ? input.qrCode : undefined,
      phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : undefined,
      webhookUrl: input.webhookUrl !== undefined ? input.webhookUrl : undefined,
      metadata: toJsonObjectOrUndefined(input.metadata) ?? undefined,
      connectedAt:
        input.status === WhatsappInstanceStatus.CONNECTED
          ? now
          : undefined,
      disconnectedAt:
        input.status === WhatsappInstanceStatus.DISCONNECTED ||
        input.status === WhatsappInstanceStatus.ERROR
          ? now
          : undefined,
    },
  });
}

export async function listWhatsappConversations(input?: { instanceId?: string }) {
  return prisma.whatsappConversation.findMany({
    where: input?.instanceId ? { instanceId: input.instanceId } : undefined,
    include: {
      contact: true,
      instance: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getWhatsappConversationById(id: string) {
  return prisma.whatsappConversation.findUnique({
    where: { id },
    include: {
      contact: true,
      instance: true,
    },
  });
}

export async function listWhatsappMessages(conversationId: string) {
  return prisma.whatsappMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createOutgoingWhatsappMessage(input: {
  instanceId: string;
  conversationId: string;
  contactId?: string | null;
  externalMessageId?: string | null;
  textContent: string;
  rawPayload?: Record<string, unknown>;
  sentAt?: Date;
}) {
  const sentAt = input.sentAt || new Date();

  return prisma.$transaction(async (tx) => {
    const message = await tx.whatsappMessage.create({
      data: {
        instanceId: input.instanceId,
        conversationId: input.conversationId,
        contactId: input.contactId || null,
        externalMessageId: input.externalMessageId || null,
        direction: WhatsappMessageDirection.OUTBOUND,
        messageType: WhatsappMessageType.TEXT,
        textContent: input.textContent,
        rawPayload: toJsonObjectOrUndefined(input.rawPayload) ?? undefined,
        sentAt,
      },
    });

    await tx.whatsappConversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageAt: sentAt,
      },
    });

    return message;
  });
}

export async function persistWhatsappWebhookEvent(
  event: NormalizedWhatsappWebhookEvent,
): Promise<{ ok: boolean; reason?: string; instanceId?: string }> {
  const instance = event.externalInstanceId
    ? await prisma.whatsappInstance.findFirst({
        where: { externalInstanceId: event.externalInstanceId },
      })
    : null;

  await prisma.whatsappEventLog.create({
    data: {
      instanceId: instance?.id || null,
      eventType: event.eventType,
      payload: event.rawPayload as Prisma.InputJsonObject,
      processedAt: new Date(),
    },
  });

  if (!instance) {
    return { ok: false, reason: "instance-not-found" };
  }

  const externalContactId = event.externalContactId || sanitizePhone(event.contactPhone);
  if (!externalContactId) {
    return { ok: false, reason: "contact-not-found", instanceId: instance.id };
  }

  const phone = sanitizePhone(event.contactPhone) || externalContactId;
  const eventTime = parseEventTimestamp(event.timestamp);

  await prisma.$transaction(async (tx) => {
    const contact = await tx.whatsappContact.upsert({
      where: {
        instanceId_externalContactId: {
          instanceId: instance.id,
          externalContactId,
        },
      },
      update: {
        name: event.contactName || undefined,
        phone,
        metadata: toJsonObjectOrUndefined({
          lastEventType: event.eventType,
          lastSeenAt: eventTime.toISOString(),
        }),
      },
      create: {
        instanceId: instance.id,
        externalContactId,
        name: event.contactName || null,
        phone,
        metadata: toJsonObjectOrUndefined({
          firstEventType: event.eventType,
          firstSeenAt: eventTime.toISOString(),
        }),
      },
    });

    const conversation = await tx.whatsappConversation.upsert({
      where: {
        instanceId_contactId: {
          instanceId: instance.id,
          contactId: contact.id,
        },
      },
      update: {
        externalConversationId:
          event.externalConversationId || undefined,
        lastMessageAt: eventTime,
        unreadCount:
          event.direction === "INBOUND"
            ? { increment: 1 }
            : undefined,
      },
      create: {
        instanceId: instance.id,
        contactId: contact.id,
        externalConversationId: event.externalConversationId || null,
        lastMessageAt: eventTime,
        unreadCount: event.direction === "INBOUND" ? 1 : 0,
        status: WhatsappConversationStatus.OPEN,
      },
    });

    if (event.externalMessageId) {
      const existing = await tx.whatsappMessage.findFirst({
        where: {
          instanceId: instance.id,
          externalMessageId: event.externalMessageId,
        },
      });

      if (existing) {
        return;
      }
    }

    await tx.whatsappMessage.create({
      data: {
        instanceId: instance.id,
        conversationId: conversation.id,
        contactId: contact.id,
        externalMessageId: event.externalMessageId || null,
        direction: toDirection(event.direction),
        messageType: toMessageType(event.messageType),
        textContent: event.textContent || null,
        mediaUrl: event.mediaUrl || null,
        rawPayload: event.rawPayload as Prisma.InputJsonObject,
        receivedAt:
          event.direction === "INBOUND" ? eventTime : undefined,
        sentAt:
          event.direction === "OUTBOUND" ? eventTime : undefined,
      },
    });
  });

  return { ok: true, instanceId: instance.id };
}
