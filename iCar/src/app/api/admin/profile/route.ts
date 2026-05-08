import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    if (!admin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error("GET admin profile error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { username, currentPassword, newPassword } = body;

    const admin = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!admin) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    const updateData: { username?: string; password?: string } = {};

    // Handle username update
    if (username && username.trim() && username.trim() !== admin.username) {
      const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
      if (existing && existing.id !== admin.id) {
        return NextResponse.json({ message: "Username already taken" }, { status: 409 });
      }
      updateData.username = username.trim();
    }

    // Handle password update
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ message: "Current password is required" }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, admin.password);
      if (!valid) {
        return NextResponse.json({ message: "Current password is incorrect" }, { status: 401 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ message: "New password must be at least 6 characters" }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No changes to save" }, { status: 400 });
    }

    const updatedAdmin = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, username: true, role: true },
    });

    return NextResponse.json(updatedAdmin);
  } catch (error) {
    console.error("PUT admin profile error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
