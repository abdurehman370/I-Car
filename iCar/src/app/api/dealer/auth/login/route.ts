import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const dealer = await prisma.dealer.findUnique({
      where: { email },
    });

    if (!dealer) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Check if dealer is approved
    if (dealer.approvalStatus !== 'approved') {
      return NextResponse.json({ 
        message: 'Your account is pending approval. Please wait for admin approval.' 
      }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, dealer.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    await login({ 
      id: dealer.id, 
      email: dealer.email, 
      dealershipName: dealer.dealershipName,
      approvalStatus: dealer.approvalStatus 
    });

    return NextResponse.json({ message: 'Login successful' }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
