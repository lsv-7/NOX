import { NextResponse } from "next/server";
import { razorpayHelper } from "@/lib/razorpay";
import { confirmOrderPayment } from "@/lib/orders";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    // Validate inputs
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing required verification details" },
        { status: 400 }
      );
    }

    // Verify signature
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
    return NextResponse.json(
      { error: errMsg || "Internal server error during verification" },
      { status: 500 }
    );
  }
}
