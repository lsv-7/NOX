import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCustomerSession, hashPassword, createCustomerSession } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/auth/change-password - Customer changes their own password
export async function POST(request: Request) {
  try {
    // 1. Verify Customer Session
    const session = await verifyCustomerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Rate limiting: 10 requests per 15 minutes per IP
    const clientIp = getClientIp(request);
    const rl = await checkRateLimit(`change-pw:${clientIp}`, 10, 15 * 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many password change attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { newPassword } = body;

    // 3. Validation
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // 4. Verify Customer Exists
    const customer = await db.customer.findUnique({
      where: { id: session.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // 5. Hash new password with bcrypt (12 rounds)
    const newHash = await hashPassword(newPassword);

    // 6. Update customer: new passwordHash, new passwordChangedAt, mustChangePassword = false
    const now = new Date();
    await db.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: newHash,
        passwordChangedAt: now,
        mustChangePassword: false,
      },
    });

    // 7. Re-issue fresh customer session cookie with updated issuedAt > passwordChangedAt
    await createCustomerSession(customer.id);

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Customer change-password error:", errMsg);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
