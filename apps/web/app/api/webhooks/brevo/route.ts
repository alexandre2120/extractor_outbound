import { NextRequest, NextResponse } from "next/server";
import { prisma, DeliveryEventType } from "@repo/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Mapeia o evento da Brevo para o nosso DeliveryEventType.
const EVENT_MAP: Record<string, DeliveryEventType> = {
  request: DeliveryEventType.QUEUED,
  delivered: DeliveryEventType.DELIVERED,
  opened: DeliveryEventType.OPENED,
  unique_opened: DeliveryEventType.OPENED,
  click: DeliveryEventType.CLICKED,
  hard_bounce: DeliveryEventType.BOUNCED,
  soft_bounce: DeliveryEventType.BOUNCED,
  blocked: DeliveryEventType.BOUNCED,
  invalid_email: DeliveryEventType.BOUNCED,
  spam: DeliveryEventType.FAILED,
  deferred: DeliveryEventType.FAILED,
  error: DeliveryEventType.FAILED,
};

interface BrevoEvent {
  event?: string;
  email?: string;
  "message-id"?: string;
  messageId?: string;
  ts?: number;
  date?: string;
  [k: string]: unknown;
}

/** Localiza a GeneratedMessage a partir do message-id (via DeliveryEvent de envio). */
async function findMessageId(providerMessageId: string): Promise<string | null> {
  const ev = await prisma.deliveryEvent.findFirst({
    where: { providerId: providerMessageId },
    orderBy: { occurredAt: "asc" },
    select: { messageId: true },
  });
  return ev?.messageId ?? null;
}

export async function POST(req: NextRequest) {
  // Verificação opcional por segredo (?secret=... na URL configurada no Brevo).
  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (secret && req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const events: BrevoEvent[] = Array.isArray(payload)
    ? (payload as BrevoEvent[])
    : [payload as BrevoEvent];

  let recorded = 0;
  let unmatched = 0;

  for (const e of events) {
    const type = e.event ? EVENT_MAP[e.event] : undefined;
    const providerId = e["message-id"] ?? e.messageId;
    if (!type || !providerId) continue;

    const messageId = await findMessageId(providerId);
    if (!messageId) {
      unmatched++;
      continue;
    }

    await prisma.deliveryEvent.create({
      data: {
        messageId,
        type,
        provider: "brevo",
        providerId,
        metadata: { event: e.event, email: e.email, ts: e.ts ?? e.date },
        occurredAt: e.ts ? new Date(e.ts * 1000) : new Date(),
      },
    });
    recorded++;
  }

  // Sempre 200 para o Brevo não reencaminhar indefinidamente.
  return NextResponse.json({ ok: true, recorded, unmatched });
}
