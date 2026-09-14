import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createCustomerSession } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const INDIAN_PHONE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function POST(request: Request) {
  try {
    // 1. Rate limiting: 10 registrations per hour per IP
    const clientIp = getClientIp(request);
    const rl = await checkRateLimit(`reg:${clientIp}`, 10, 60 * 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, phone, email, password } = body;

    // 1. Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Full name is required (minimum 2 characters)" },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || !INDIAN_PHONE_REGEX.test(phone.trim())) {
      return NextResponse.json(
        { error: "A valid 10-digit Indian mobile number is required" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone.trim());
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // 2. Uniqueness Checks
    const existingPhone = await db.customer.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existingPhone) {
      return NextResponse.json(
        { error: "An account with this mobile number already exists" },
        { status: 409 }
      );
    }

    const existingEmail = await db.customer.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    // 3. Hash Password (bcrypt 12 rounds)
    const passwordHash = await hashPassword(password);

    // 4. Create Customer
    const customer = await db.customer.create({
      data: {
        name: trimmedName,
        phone: normalizedPhone,
        email: normalizedEmail,
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    // 5. Establish Session Cookie
    await createCustomerSession(customer.id);

    return NextResponse.json(
      {
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Customer registration error:", errMsg);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
