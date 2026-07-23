import prisma from '@/lib/db';
import { requiresAdminApproval } from '@/lib/dealer-roles';
import { getPortalHomeForRole } from '@/lib/portal-access';
import bcrypt from 'bcryptjs';
import { loginDealer } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { NextResponse } from 'next/server';

const log = createLogger('auth:dealer-login');

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = await rateLimit(`login:dealer:${ip}`, { limit: 10, windowSec: 300 });
    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
      );
    }

    const body = await request.json();
    const { email, password } = body;

    const dealer = await prisma.dealer.findUnique({
      where: { email },
    });

    if (!dealer) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    if (requiresAdminApproval(dealer.role) && dealer.approvalStatus !== 'approved') {
      const message =
        dealer.approvalStatus === 'rejected'
          ? 'Your dealer account was not approved. Contact support for help.'
          : 'Your account is pending approval. Please wait for admin approval.';
      return NextResponse.json({ message }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, dealer.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    await loginDealer({
      id: dealer.id,
      email: dealer.email,
      dealershipName: dealer.dealershipName,
      role: dealer.role,
    });

    return NextResponse.json(
      {
        message: 'Login successful',
        redirectUrl: getPortalHomeForRole(dealer.role),
        role: dealer.role,
      },
      { status: 200 }
    );
  } catch (error) {
    log.error('Dealer login error', { err: error });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
