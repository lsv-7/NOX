import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    const body = await request.json();
    const { deliveryStatus } = body;

    // Validate order ID presence
    if (!orderId) {
      return NextResponse.json({ error: "Order ID parameter is required" }, { status: 400 });
    }

    // Validate deliveryStatus parameter
    if (deliveryStatus !== "SENT") {
      return NextResponse.json(
        { error: "Invalid status transition. Only 'SENT' is permitted." },
        { status: 400 }
      );
    }

    // Retrieve order to verify it exists and is paid
    const order = await db.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus !== "PAID") {
      return NextResponse.json(
        { error: "Cannot mark unpaid orders as sent." },
        { status: 400 }
      );
    }

    // Perform the status mutation securely
    const updatedOrder = await db.order.update({
      where: { id: order.id },
      data: {
        deliveryStatus: "SENT",
      },
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin PATCH order error:", errMsg);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
