import { logoutAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  await logoutAdmin();
  return NextResponse.json({ success: true });
}
