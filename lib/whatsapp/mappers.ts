import { WhatsappInstanceStatus } from "@prisma/client";

export function mapProviderStateToInstanceStatus(
  state: string | undefined,
): WhatsappInstanceStatus {
  if (!state) {
    return WhatsappInstanceStatus.DISCONNECTED;
  }

  if (state === "CONNECTED") return WhatsappInstanceStatus.CONNECTED;
  if (state === "CONNECTING") return WhatsappInstanceStatus.CONNECTING;
  if (state === "QRCODE") return WhatsappInstanceStatus.QRCODE;
  if (state === "ERROR") return WhatsappInstanceStatus.ERROR;

  return WhatsappInstanceStatus.DISCONNECTED;
}
