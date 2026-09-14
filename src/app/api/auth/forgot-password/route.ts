import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function POST(request: Request) {
  try {
    // 1. Rate limiting: 5 requests per 15 minutes per IP
    const clientIp = getClientIp(request);
    const rl = await checkRateLimit(`forgot:${clientIp}`, 5, 15 * 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { identifier, email, phone } = body;

    const input = (identifier || email || phone || "").trim();
    if (!input) {
      return NextResponse.json(
        { error: "Registered email or mobile number is required" },
        { status: 400 }
      );
    }

    let customer = null;
    if (input.includes("@")) {
      customer = await db.customer.findUnique({
        where: { email: input.toLowerCase() },
      });
    } else {
      const normalizedPhone = normalizePhone(input);
      customer = await db.customer.findUnique({
        where: { phone: normalizedPhone },
      });
    }

    // Generic success message to prevent account enumeration
    const genericResponse: { success: boolean; message: string; testToken?: string } = {
      success: true,
      message:
        "If an account exists for this email, a password reset link has been sent.",
    };

    if (customer) {
      // 1. Generate 32-byte cryptographically secure random token
      const rawToken = crypto.randomBytes(32).toString("hex");

      // 2. Hash token with SHA-256 for secure database storage
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      // 3. Clean up any existing tokens for this customer
      await db.passwordResetToken.deleteMany({
        where: { customerId: customer.id },
      });

      // 4. Save token with 15-minute expiration
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);
      await db.passwordResetToken.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt,
        },
      });

      // 5. Construct reset link and dispatch email via production provider
      const appBaseUrl = process.env.APP_URL || "http://localhost:3000";
      const resetUrl = `${appBaseUrl}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(customer.email, customer.name, resetUrl);

      // In non-production test suites only, provide token when explicitly requested for regression testing
      if (process.env.NODE_ENV !== "production" && process.env.NOX_ALLOW_TEST_RESET_TOKEN === "true") {
        genericResponse.testToken = rawToken;
      }
    }

    return NextResponse.json(genericResponse, { status: 200 });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Forgot password error:", errMsg);
    return NextResponse.json(
      { error: "Internal server error processing reset request" },
      { status: 500 }
    );
  }
}
