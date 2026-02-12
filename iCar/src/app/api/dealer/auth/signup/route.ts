import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      dealershipName, 
      contactPerson, 
      phoneNumber,
      address,
      city,
      country
    } = body;

    // Validate required fields
    if (!email || !password || !dealershipName || !contactPerson || !phoneNumber) {
      return NextResponse.json({ 
        message: 'Please fill in all required fields' 
      }, { status: 400 });
    }

    // Check if dealer already exists
    const existingDealer = await prisma.dealer.findUnique({
      where: { email },
    });

    if (existingDealer) {
      return NextResponse.json({ 
        message: 'A dealer with this email already exists' 
      }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create dealer with pending approval status
    const dealer = await prisma.dealer.create({
      data: {
        email,
        password: hashedPassword,
        dealershipName,
        contactPerson,
        phoneNumber,
        address,
        city,
        country,
        approvalStatus: 'pending', // Default status
      },
    });

    return NextResponse.json({ 
      message: 'Signup successful! Your account is pending admin approval.' 
    }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
