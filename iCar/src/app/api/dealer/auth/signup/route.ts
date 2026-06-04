import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const MAX_LICENSE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_LICENSE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'application/pdf':
      return 'pdf';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

async function saveLicenseDocument(dealerId: number, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = extensionForMime(file.type);
  const uploadDir = path.join(
    process.cwd(),
    'public',
    'uploads',
    'dealer-licenses',
    String(dealerId)
  );
  await fs.mkdir(uploadDir, { recursive: true });

  const filename = `license.${ext}`;
  await fs.writeFile(path.join(uploadDir, filename), buffer);

  return `/uploads/dealer-licenses/${dealerId}/${filename}`;
}

export async function POST(request: Request) {
  let createdDealerId: number | null = null;

  try {
    const formData = await request.formData();

    const email = (formData.get('email') as string | null)?.trim();
    const password = formData.get('password') as string | null;
    const dealershipName = (formData.get('dealershipName') as string | null)?.trim();
    const contactPerson = (formData.get('contactPerson') as string | null)?.trim();
    const phoneNumber = (formData.get('phoneNumber') as string | null)?.trim();
    const address = (formData.get('address') as string | null)?.trim() || null;
    const city = (formData.get('city') as string | null)?.trim() || null;
    const country = (formData.get('country') as string | null)?.trim() || null;
    const role = (formData.get('role') as string | null)?.trim() || 'User';
    const licenseFile = formData.get('licenseDocument');

    if (!email || !password || !dealershipName || !contactPerson || !phoneNumber) {
      return NextResponse.json(
        { message: 'Please fill in all required fields' },
        { status: 400 }
      );
    }

    if (role === 'Car Dealers') {
      if (!(licenseFile instanceof File) || licenseFile.size === 0) {
        return NextResponse.json(
          { message: 'Dealership license document is required for Car Dealers' },
          { status: 400 }
        );
      }

      if (!ALLOWED_LICENSE_TYPES.has(licenseFile.type)) {
        return NextResponse.json(
          { message: 'License must be a PDF or image (JPEG, PNG, or WebP)' },
          { status: 400 }
        );
      }

      if (licenseFile.size > MAX_LICENSE_SIZE_BYTES) {
        return NextResponse.json(
          { message: 'License file must be 5MB or smaller' },
          { status: 400 }
        );
      }
    }

    const existingDealer = await prisma.dealer.findUnique({
      where: { email },
    });

    if (existingDealer) {
      return NextResponse.json(
        { message: 'A dealer with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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
        role,
        approvalStatus: 'pending',
      },
    });

    createdDealerId = dealer.id;

    if (role === 'Car Dealers' && licenseFile instanceof File) {
      const licenseDocumentUrl = await saveLicenseDocument(dealer.id, licenseFile);

      await prisma.dealer.update({
        where: { id: dealer.id },
        data: { licenseDocumentUrl },
      });
    }

    return NextResponse.json(
      {
        message:
          'Signup successful! Your account and dealership license are pending admin review.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (createdDealerId !== null) {
      try {
        await prisma.dealer.delete({ where: { id: createdDealerId } });
        const licenseDir = path.join(
          process.cwd(),
          'public',
          'uploads',
          'dealer-licenses',
          String(createdDealerId)
        );
        await fs.rm(licenseDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }

    console.error('Signup error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
