import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { razorpayHelper } from "@/lib/razorpay";

// Regular expressions for validation
const INDIAN_PHONE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;
const PINCODE_REGEX = /^\d{6}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, phone, address, pincode, quantity, size } = body;

    // 1. Input Validation
    if (!customerName || typeof customerName !== "string" || customerName.trim() === "") {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    if (!phone || typeof phone !== "string" || !INDIAN_PHONE_REGEX.test(phone.trim())) {
      return NextResponse.json({ error: "A valid 10-digit Indian mobile number is required" }, { status: 400 });
    }

    if (!address || typeof address !== "string" || address.trim() === "") {
      return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
    }

    if (!pincode || typeof pincode !== "string" || !PINCODE_REGEX.test(pincode.trim())) {
      return NextResponse.json({ error: "A valid 6-digit PIN code is required" }, { status: 400 });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: "Quantity must be a positive integer" }, { status: 400 });
    }

    // 2. Server-side Secure Price Calculation (in Paise)
    const selectedSize = (size === "Small" || size === "Small (50ml)") ? "Small" : "Large";
    const productPriceInr = selectedSize === "Small" ? 699 : 1299;

    const shippingChargeInr = parseInt(process.env.NOX_SHIPPING_CHARGE_INR || "0", 10);
    const subtotal = productPriceInr * qty;
    const totalAmountInr = subtotal + shippingChargeInr;
    const totalAmountPaise = totalAmountInr * 100;

    // 3. Atomic Order ID Generation (Increment)
    const nextCounter = await db.orderCounter.increment();
    const orderId = `NOX-${String(nextCounter).padStart(5, "0")}`;

    // 4. Create Razorpay Order
    let razorpayOrder;
    try {
      razorpayOrder = await razorpayHelper.createOrder(totalAmountPaise, orderId);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Razorpay order creation failed:", errMsg);
      return NextResponse.json({ error: "Failed to initialize payment gateway" }, { status: 500 });
    }

    // 5. Save PENDING Order to Database (PostgreSQL / Mock)
    try {
      await db.order.create({
        data: {
          orderId,
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          pincode: pincode.trim(),
          quantity: qty,
          amount: totalAmountPaise,
          razorpayOrderId: razorpayOrder.id,
          paymentStatus: "PENDING",
          orderStatus: "NEW",
          notificationStatus: "PENDING",
        },
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to persist pending order to database:", errMsg);
      return NextResponse.json({ error: "Failed to record order details" }, { status: 500 });
    }

    // 6. Return response to frontend
    return NextResponse.json({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmountPaise,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_mock_id_123",
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      pincode: pincode.trim(),
      quantity: qty,
      subtotal: subtotal * 100,
      shipping: shippingChargeInr * 100,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating order:", errMsg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
