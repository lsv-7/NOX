import { NextResponse } from "next/server";
import { db, Order } from "@/lib/db";

// Regular expressions for validation
const INDIAN_PHONE_REGEX = /^(?:\+91|91|0)?[6-9]\d{9}$/;
const ORDER_ID_REGEX = /^NOX-\d{5,}$/i;

// Helper to format safe order data
function extractSafeFields(order: Order) {
  return {
    orderId: order.orderId,
    amount: order.amount, // stored in paise
    paymentStatus: order.paymentStatus,
    deliveryStatus: order.deliveryStatus,
    createdAt: order.createdAt,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, phone, orders } = body;

    // 1. Batch lookup flow
    if (orders && Array.isArray(orders)) {
      const results = [];
      
      for (const item of orders) {
        if (!item.orderId || !item.phone) continue;
        
        // Baseline format validation
        if (!ORDER_ID_REGEX.test(item.orderId.trim()) || !INDIAN_PHONE_REGEX.test(item.phone.trim())) {
          continue;
        }

        const order = await db.order.findUnique({
          where: { orderId: item.orderId.trim() },
        });

        if (order && order.phone.trim() === item.phone.trim()) {
          results.push(extractSafeFields(order));
        }
      }

      return NextResponse.json({ success: true, orders: results });
    }

    // 2. Single lookup flow (Import/Track verification)
    if (!orderId || !phone) {
      return NextResponse.json(
        { error: "Order not found or details don't match." },
        { status: 400 }
      );
    }

    const trimmedOrderId = orderId.trim();
    const trimmedPhone = phone.trim();

    // Baseline validation check (Abuse protection)
    if (!ORDER_ID_REGEX.test(trimmedOrderId) || !INDIAN_PHONE_REGEX.test(trimmedPhone)) {
      return NextResponse.json(
        { error: "Order not found or details don't match." },
        { status: 404 }
      );
    }

    const order = await db.order.findUnique({
      where: { orderId: trimmedOrderId },
    });

    if (!order || order.phone.trim() !== trimmedPhone) {
      return NextResponse.json(
        { error: "Order not found or details don't match." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: extractSafeFields(order),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Order tracking retrieval error:", errMsg);
    return NextResponse.json({ error: "Order not found or details don't match." }, { status: 500 });
  }
}
