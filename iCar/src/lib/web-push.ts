import webpush from 'web-push';
import prisma from './db';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@icar.com';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export function isPushConfigured(): boolean {
  return Boolean(vapidPublicKey && vapidPrivateKey);
}

export function getVapidPublicKey(): string | null {
  return vapidPublicKey ?? null;
}

function ensureVapidConfigured(): void {
  if (!isPushConfigured()) {
    throw new Error('Web push is not configured. Set VAPID keys in environment.');
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);
}

export async function sendPushToDealer(
  dealerId: number,
  payload: PushPayload,
): Promise<void> {
  if (!isPushConfigured()) return;

  ensureVapidConfigured();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { dealerId },
  });

  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }),
  );
}

export async function sendPushToDealers(
  dealerIds: number[],
  payload: PushPayload,
): Promise<void> {
  const uniqueIds = [...new Set(dealerIds)];
  await Promise.allSettled(
    uniqueIds.map((dealerId) => sendPushToDealer(dealerId, payload)),
  );
}
