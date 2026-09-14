import { NextResponse } from "next/server";
import { verifyCustomerSession } from "@/lib/customer-auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // 1. Authenticate request using secure session cookie
    const session = await verifyCustomerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view this order." },
        { status: 401 }
      );
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID parameter is required" },
        { status: 400 }
      );
    }

    // 2. Fetch requested order from database
    const order = await db.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // 3. STRICT OWNERSHIP CHECK: Verify that order belongs to authenticated customer
    if (order.customerId !== session.customerId) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to access this order." },
        { status: 403 }
      );
    }

    // 4. Parse items safely
    let parsedItems = [];
    try {
      if (order.items) {
        parsedItems = JSON.parse(order.items);
      }
    } catch {
      parsedItems = [];
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderId: order.orderId,
        customerName: order.customerName,
        phone: order.phone,
        address: order.address,
        pincode: order.pincode,
        quantity: order.quantity,
        amount: order.amount, // in paise
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        orderStatus: order.orderStatus,
        items: parsedItems,
        createdAt: order.createdAt,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Individual order retrieval error:", errMsg);
    return NextResponse.json(
      { error: "Internal server error retrieving order" },
      { status: 500 }
    );
  }
}
