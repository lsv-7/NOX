import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { razorpayHelper } from "@/lib/razorpay";
import { verifyCustomerSession } from "@/lib/customer-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Regular expressions for validation
const INDIAN_PHONE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;
const PINCODE_REGEX = /^\d{6}$/;

export async function POST(request: Request) {
  try {
    // 0. Rate Limiting: 10 order initialization requests per minute per IP
    const clientIp = getClientIp(request);
    const rl = await checkRateLimit(`order_create:${clientIp}`, 10, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many checkout requests. Please try again in a moment." },
        { status: 429 }
      );
    }

    // 1. Enforce Customer Authentication (Strict session requirement, NO guest checkout)
    const session = await verifyCustomerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in or register before completing your purchase." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { customerName, phone, address, pincode, quantity, size, items } = body;

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

    // 2. Server-side Secure Price Calculation (in Paise)
    let totalQty = 0;
    let subtotal = 0;
    const validatedItems: Array<{
      name: string;
      size: "15g" | "50g";
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const itemSize = (item.size === "15g" || item.size === "Small") ? "15g" : (item.size === "50g" || item.size === "Large") ? "50g" : null;
        const itemQty = parseInt(item.quantity, 10);
        if (!itemSize || isNaN(itemQty) || itemQty <= 0 || itemQty > 50) {
          return NextResponse.json({ error: "Invalid item size or quantity (max 50 units per variant)" }, { status: 400 });
        }
        const unitPrice = itemSize === "15g" ? 699 : 1299;
        const lineSubtotal = unitPrice * itemQty;
        totalQty += itemQty;
        subtotal += lineSubtotal;
        validatedItems.push({
          name: "NOX Night Cream",
          size: itemSize,
          quantity: itemQty,
          unitPrice,
          subtotal: lineSubtotal,
        });
      }
    } else {
      // Backward-compatible fallback for single-item order creation
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0 || qty > 50) {
        return NextResponse.json({ error: "Quantity must be a positive integer (max 50)" }, { status: 400 });
      }
      const selectedSize: "15g" | "50g" = (size === "Small" || size === "Small (50ml)" || size === "15g") ? "15g" : "50g";
      const productPriceInr = selectedSize === "15g" ? 699 : 1299;
      subtotal = productPriceInr * qty;
      totalQty = qty;
      validatedItems.push({
        name: "NOX Night Cream",
        size: selectedSize,
        quantity: qty,
        unitPrice: productPriceInr,
        subtotal,
      });
    }

    const shippingChargeInr = parseInt(process.env.NOX_SHIPPING_CHARGE_INR || "0", 10);
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
          customerId: session.customerId,
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          pincode: pincode.trim(),
          quantity: totalQty,
          amount: totalAmountPaise,
          razorpayOrderId: razorpayOrder.id,
          paymentStatus: "PENDING",
          orderStatus: "NEW",
          notificationStatus: "PENDING",
          items: JSON.stringify(validatedItems),
        },
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to persist pending order to database:", errMsg);
      return NextResponse.json({ error: "Failed to record order details" }, { status: 500 });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    if (!razorpayKeyId && process.env.NODE_ENV === "production") {
      console.error("Missing RAZORPAY_KEY_ID in production environment");
      return NextResponse.json({ error: "Payment gateway configuration error" }, { status: 500 });
    }

    // 6. Return response to frontend
    return NextResponse.json({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmountPaise,
      keyId: razorpayKeyId || "rzp_test_mock_id_123",
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      pincode: pincode.trim(),
      quantity: totalQty,
      subtotal: subtotal * 100,
      shipping: shippingChargeInr * 100,
      items: validatedItems,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating order:", errMsg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
