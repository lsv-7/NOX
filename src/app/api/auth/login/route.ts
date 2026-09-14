import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createCustomerSession } from "@/lib/customer-auth";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, email, phone, password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const loginId = (identifier || email || phone || "").trim();
    if (!loginId) {
      return NextResponse.json(
        { error: "Email or phone number is required" },
        { status: 400 }
      );
    }

    let customer = null;

    if (loginId.includes("@")) {
      // Lookup by email
      customer = await db.customer.findUnique({
        where: { email: loginId.toLowerCase() },
      });
    } else {
      // Lookup by phone
      const normalizedPhone = normalizePhone(loginId);
      customer = await db.customer.findUnique({
        where: { phone: normalizedPhone },
      });
    }

    // Fallback: If not found and input might be either, check both
    if (!customer && !loginId.includes("@")) {
      const normalizedPhone = normalizePhone(loginId);
      customer = await db.customer.findFirst({
        where: {
          OR: [
            { email: loginId.toLowerCase() },
            { phone: normalizedPhone },
          ],
        },
      });
    }

    if (!customer) {
      return NextResponse.json(
        { error: "Invalid email/phone or password" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, customer.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email/phone or password" },
        { status: 401 }
      );
    }

    // Issue HTTP-Only session cookie
    await createCustomerSession(customer.id);

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Customer login error:", errMsg);
    return NextResponse.json(
      { error: "Internal server error during login" },
      { status: 500 }
    );
  }
}
