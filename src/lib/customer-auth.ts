import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

const SESSION_COOKIE_NAME = "nox_customer_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSessionSecret(): string {
  const secret = process.env.NOX_CUSTOMER_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NOX_CUSTOMER_SESSION_SECRET environment variable is required in production.");
    }
    return "nox_dev_fallback_session_secret_32chars_long_key";
  }
  return secret;
}

function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createCustomerSession(customerId: string): Promise<void> {
  const secret = getSessionSecret();
  const issuedAt = Date.now();
  const expiry = issuedAt + SESSION_DURATION_MS;
  const payload = `${customerId}:${issuedAt}:${expiry}`;
  const signature = generateSignature(payload, secret);
  const token = `${payload}:${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 3600, // 7 days in seconds
    path: "/",
  });
}

export async function verifyCustomerSession(): Promise<{ customerId: string } | null> {
  try {
    const secret = getSessionSecret();
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie || !cookie.value) {
      return null;
    }

    const rawValue = decodeURIComponent(cookie.value);
    const parts = rawValue.split(":");
    let customerId = "";
    let issuedAt = 0;
    let expiry = 0;
    let signature = "";
    let payload = "";

    if (parts.length === 4) {
      // Modern format: customerId:issuedAt:expiry:signature
      const [cId, issuedStr, expStr, sig] = parts;
      customerId = cId;
      issuedAt = parseInt(issuedStr, 10);
      expiry = parseInt(expStr, 10);
      signature = sig;
      payload = `${customerId}:${issuedAt}:${expiry}`;
    } else if (parts.length === 3) {
      // Backward-compatible format: customerId:expiry:signature
      const [cId, expStr, sig] = parts;
      customerId = cId;
      expiry = parseInt(expStr, 10);
      signature = sig;
      payload = `${customerId}:${expiry}`;
    } else {
      return null;
    }

    if (!customerId || isNaN(expiry) || expiry < Date.now() || !signature) {
      return null;
    }

    const expectedSignature = generateSignature(payload, secret);
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    // Verify customer existence in DB and check dedicated passwordChangedAt invalidation
    const customer = await db.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return null;
    }

    // If session was issued before a password change, invalidate session
    if (issuedAt > 0 && customer.passwordChangedAt) {
      const passwordChangedMs = new Date(customer.passwordChangedAt).getTime();
      const issuedAtMs = issuedAt < 1e11 ? issuedAt * 1000 : issuedAt;
      if (issuedAtMs < passwordChangedMs) {
        return null;
      }
    }

    return { customerId };
  } catch (error) {
    console.error("Customer session verification error:", error);
    return null;
  }
}

export async function destroyCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
