import { cookies } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "nox_admin_session";
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

// Helper to generate a signature for the session data
function generateSessionSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

export async function createAdminSession(passwordInput: string): Promise<boolean> {
  const adminPassword = process.env.NOX_ADMIN_PASSWORD;
  const sessionSecret = process.env.NOX_ADMIN_SESSION_SECRET;

  if (!adminPassword || !sessionSecret) {
    console.error("Missing server configuration: NOX_ADMIN_PASSWORD or NOX_ADMIN_SESSION_SECRET is undefined.");
    return false;
  }

  // Verify password matches using constant-time comparison
  const inputBuf = Buffer.from(passwordInput, "utf-8");
  const adminBuf = Buffer.from(adminPassword, "utf-8");
  if (inputBuf.length !== adminBuf.length || !crypto.timingSafeEqual(inputBuf, adminBuf)) {
    return false;
  }

  const sessionId = crypto.randomBytes(32).toString("hex");
  const expiry = Date.now() + SESSION_DURATION_MS;
  const payload = `${sessionId}:${expiry}`;
  const signature = generateSessionSignature(payload, sessionSecret);
  const token = `${payload}:${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7200, // 2 hours in seconds
    path: "/",
  });

  return true;
}

export async function verifyAdminSession(): Promise<boolean> {
  const sessionSecret = process.env.NOX_ADMIN_SESSION_SECRET;
  if (!sessionSecret) {
    console.error("Verification failed: NOX_ADMIN_SESSION_SECRET is undefined.");
    return false;
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie || !cookie.value) {
      return false;
    }

    const rawValue = decodeURIComponent(cookie.value);
    const parts = rawValue.split(":");
    if (parts.length !== 3) {
      return false;
    }

    const [sessionId, expiryStr, signature] = parts;
    if (!sessionId || !expiryStr || !signature) {
      return false;
    }

    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || expiry < Date.now()) {
      return false;
    }

    // Verify integrity using HMAC signature
    const payload = `${sessionId}:${expiry}`;
    const expectedSignature = generateSessionSignature(payload, sessionSecret);
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (e) {
    console.error("Session verification failed with error:", e);
    return false;
  }
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
