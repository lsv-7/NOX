import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";

// GET /api/admin/orders - Fetch all orders
export async function GET() {
  try {
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await db.order.findMany();
    
    // Sort descending numerically by the numeric portion of orderId
    orders.sort((a, b) => {
      const numA = parseInt(a.orderId.replace(/\D/g, "") || "0", 10);
      const numB = parseInt(b.orderId.replace(/\D/g, "") || "0", 10);
      return numB - numA;
    });

    return NextResponse.json({ orders });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin fetch orders error:", errMsg);
    return NextResponse.json({ error: "Failed to retrieve orders" }, { status: 500 });
  }
}

// PUT /api/admin/orders - Update order status or details
export async function PUT(request: Request) {
  try {
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, orderStatus, notificationStatus, paymentStatus } = body;

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const dataToUpdate: {
      orderStatus?: "NEW" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
      notificationStatus?: "PENDING" | "SENT" | "FAILED";
      paymentStatus?: "PENDING" | "PAID" | "FAILED";
    } = {};

    if (orderStatus) dataToUpdate.orderStatus = orderStatus;
    if (notificationStatus) dataToUpdate.notificationStatus = notificationStatus;
    if (paymentStatus) dataToUpdate.paymentStatus = paymentStatus;

    const updatedOrder = await db.order.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin update order error:", errMsg);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
