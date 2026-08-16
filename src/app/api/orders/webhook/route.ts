import { NextResponse } from "next/server";
import { razorpayHelper } from "@/lib/razorpay";
import { confirmOrderPayment } from "@/lib/orders";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    if (!signature) {
      console.warn("[Webhook] Missing x-razorpay-signature header");
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    // 1. Verify webhook signature
    const isValid = razorpayHelper.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 2. Parse event payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    console.log(`[Webhook] Received Razorpay event: ${event}`);

    // We look for 'payment.captured' as the authoritative payment event
    if (event === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      if (!razorpayOrderId) {
        console.error("[Webhook] payment.captured missing order_id");
        return NextResponse.json({ error: "Missing order_id in payment payload" }, { status: 400 });
      }

      console.log(`[Webhook] Authoritative confirmation for order: ${razorpayOrderId}, payment: ${paymentId}`);

      // Idempotently confirm payment & send WhatsApp notification
      await confirmOrderPayment(razorpayOrderId, paymentId);
    } else {
      console.log(`[Webhook] Event ${event} is not handled, skipping.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing Razorpay webhook:", errMsg);
    return NextResponse.json(
      { error: errMsg || "Internal server error during webhook" },
      { status: 500 }
    );
  }
}
