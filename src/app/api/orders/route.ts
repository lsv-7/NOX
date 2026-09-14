import { NextResponse } from "next/server";
import { verifyCustomerSession } from "@/lib/customer-auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // 1. Authenticate customer from secure HTTP-only session cookie
    const session = await verifyCustomerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view your orders." },
        { status: 401 }
      );
    }

    // 2. Query ONLY orders strictly belonging to this authenticated customer
    // NEVER accept customerId from query params or body
    const orders = await db.order.findMany({
      where: {
        customerId: session.customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Sort numerically descending by orderId to guarantee newest order first
    orders.sort((a, b) => {
      const numA = parseInt(a.orderId.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.orderId.replace(/\D/g, ""), 10) || 0;
      return numB - numA;
    });

    // 3. Format and return orders
    const safeOrders = orders.map((order) => {
      let parsedItems = [];
      try {
        if (order.items) {
          parsedItems = JSON.parse(order.items);
        }
      } catch {
        parsedItems = [];
      }

      return {
        id: order.id,
        orderId: order.orderId,
        customerName: order.customerName,
        phone: order.phone,
        quantity: order.quantity,
        amount: order.amount, // in paise
        paymentStatus: order.paymentStatus,
        deliveryStatus: order.deliveryStatus,
        orderStatus: order.orderStatus,
        items: parsedItems,
        createdAt: order.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      orders: safeOrders,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Customer orders retrieval error:", errMsg);
    return NextResponse.json(
      { error: "Internal server error retrieving order history" },
      { status: 500 }
    );
  }
}
