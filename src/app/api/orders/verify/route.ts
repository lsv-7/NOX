import { NextResponse } from "next/server";
import { razorpayHelper } from "@/lib/razorpay";
import { confirmOrderPayment } from "@/lib/orders";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // 0. Rate limiting: 20 verification attempts per minute per IP
    const clientIp = getClientIp(request);
    const rl = await checkRateLimit(`verify:${clientIp}`, 20, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many verification requests. Please try again in a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    // Validate inputs
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing required verification details" },
        { status: 400 }
      );
    }

    // Verify signature (timing-safe HMAC)
    const isValid = razorpayHelper.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      console.error(`[Verification] Signature verification failed for order: ${razorpayOrderId}`);
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    console.log(`[Verification] Signature verified for order: ${razorpayOrderId}`);

    // Confirm order (idempotent, triggers notification if not already sent)
    const order = await confirmOrderPayment(razorpayOrderId, razorpayPaymentId);

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      status: order.paymentStatus,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error verifying payment:", errMsg);
    const safeError = process.env.NODE_ENV === "production" ? "Payment verification failed" : errMsg;
    return NextResponse.json(
      { error: safeError || "Internal server error during verification" },
      { status: 500 }
    );
  }
}
