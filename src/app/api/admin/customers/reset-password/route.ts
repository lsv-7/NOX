import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";
import { hashPassword } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/admin/customers/reset-password - Admin resets customer password
export async function POST(request: Request) {
  try {
    // 1. Verify Admin Session
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Rate limiting: 10 requests per 15 minutes per IP
    const clientIp = getClientIp(request);
    const rl = await checkRateLimit(`admin-reset:${clientIp}`, 10, 15 * 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { customerId, newPassword } = body;

    // 3. Validation
    if (!customerId || typeof customerId !== "string" || !customerId.trim()) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // 4. Verify Customer Exists
    const customer = await db.customer.findUnique({
      where: { id: customerId.trim() },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // 5. Hash new password with bcrypt (12 rounds)
    const newHash = await hashPassword(newPassword);

    // 6. Update database: passwordHash, passwordChangedAt, mustChangePassword = true
    const now = new Date();
    await db.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: newHash,
        passwordChangedAt: now,
        mustChangePassword: true,
      },
    });

    // 7. Return safe response (NEVER return password or passwordHash)
    return NextResponse.json({
      success: true,
      message: `Password updated successfully for customer ${customer.name || customer.email}.`,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin customer reset-password error:", errMsg);
    return NextResponse.json(
      { error: "Failed to reset customer password" },
      { status: 500 }
    );
  }
}
