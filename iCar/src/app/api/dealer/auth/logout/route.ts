import { logoutDealer } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST() {
  await logoutDealer();
  return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
}
