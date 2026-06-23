import { NextRequest, NextResponse } from 'next/server';
import { getDealerSession } from '@/lib/auth';
import prisma from '@/lib/db';

type SubscriptionBody = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function POST(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as SubscriptionBody;
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') ?? undefined;

    const existing = await prisma.pushSubscription.findFirst({
      where: { dealerId: session.user.id, endpoint },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { p256dh: keys.p256dh, auth: keys.auth, userAgent },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          dealerId: session.user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : null;

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { dealerId: session.user.id, endpoint },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { dealerId: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const count = await prisma.pushSubscription.count({
    where: { dealerId: session.user.id },
  });

  return NextResponse.json({ subscribed: count > 0, deviceCount: count });
}
