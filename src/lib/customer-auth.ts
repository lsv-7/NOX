import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const SESSION_COOKIE_NAME = "nox_customer_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSessionSecret(): string {
  const secret = process.env.NOX_CUSTOMER_SESSION_SECRET || process.env.NOX_ADMIN_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NOX_CUSTOMER_SESSION_SECRET or NOX_ADMIN_SESSION_SECRET environment variable is required in production.");
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
  const expiry = Date.now() + SESSION_DURATION_MS;
  const payload = `${customerId}:${expiry}`;
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

    const parts = cookie.value.split(":");
    if (parts.length !== 3) {
      return null;
    }

    const [customerId, expiryStr, signature] = parts;
    if (!customerId || !expiryStr || !signature) {
      return null;
    }

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || expiry < Date.now()) {
      return null;
    }

    const payload = `${customerId}:${expiry}`;
    const expectedSignature = generateSignature(payload, secret);

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }

    const isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    if (!isValid) {
      return null;
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
