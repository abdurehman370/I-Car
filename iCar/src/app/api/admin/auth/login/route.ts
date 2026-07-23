import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';
import { NextResponse } from 'next/server';

const log = createLogger('auth:admin-login');

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limit = await rateLimit(`login:admin:${ip}`, { limit: 10, windowSec: 300 });
    if (!limit.allowed) {
      return NextResponse.json(
        { message: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
      );
    }

    const body = await request.json();
    const { username, password } = body;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    await login({ id: user.id, username: user.username, role: user.role });

    return NextResponse.json({ message: 'Login successful' }, { status: 200 });
  } catch (error) {
    log.error('Admin login error', { err: error });
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
