import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/customer-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== "string" || token.trim() === "") {
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Compute SHA-256 hash of provided token
    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    // Retrieve token record
    const resetRecord = await db.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Check if already used
    if (resetRecord.usedAt !== null) {
      return NextResponse.json(
        { error: "This reset token has already been used" },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(resetRecord.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Find associated customer
    const customer = await db.customer.findUnique({
      where: { id: resetRecord.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer account associated with token could not be found" },
        { status: 400 }
      );
    }

    // Hash new password using bcrypt (12 rounds)
    const newPasswordHash = await hashPassword(newPassword);

    // Update customer password
    await db.customer.update({
      where: { id: customer.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate reset token immediately (single-use)
    await db.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You may now sign in.",
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Password reset error:", errMsg);
    return NextResponse.json(
      { error: "Internal server error during password reset" },
      { status: 500 }
    );
  }
}
