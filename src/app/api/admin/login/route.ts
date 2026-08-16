import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const success = await createAdminSession(password);
    if (!success) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin login error:", errMsg);
    return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
  }
}
