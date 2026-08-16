import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/auth";

export async function POST() {
  try {
    await destroyAdminSession();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin logout error:", errMsg);
    return NextResponse.json({ error: "Failed to invalidate session" }, { status: 500 });
  }
}
