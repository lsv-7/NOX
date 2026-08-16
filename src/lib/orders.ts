import { db, Order } from "./db";
import { sendWhatsAppNotification } from "./whatsapp";

/**
 * Idempotently confirms payment for an order and sends a WhatsApp notification to the owner.
 * If the order is already marked as PAID, it will skip status transitions and notifications.
 */
export async function confirmOrderPayment(
  razorpayOrderId: string,
  paymentId: string
): Promise<Order> {
  // 1. Retrieve the order
  const order = await db.order.findUnique({
    where: { razorpayOrderId },
  });

  if (!order) {
    throw new Error(`Order with Razorpay ID ${razorpayOrderId} not found.`);
  }

  // 2. Idempotency Check: If already PAID, just return the order without re-triggering notifications
  if (order.paymentStatus === "PAID") {
    console.log(`[Idempotency] Order ${order.orderId} is already marked PAID. Skipping processing.`);
    return order;
  }

  // 3. Update the order status to PAID and store the payment ID
  console.log(`[Payment] Transitioning order ${order.orderId} status to PAID.`);
  const updatedOrder = await db.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      paymentId: paymentId,
    },
  });

  // 4. Send WhatsApp Notification to the owner if not already sent
  if (updatedOrder.notificationStatus !== "SENT") {
    console.log(`[Notification] Triggering WhatsApp notification for order ${order.orderId}.`);
    try {
      const whatsappResult = await sendWhatsAppNotification(updatedOrder);
      
      if (whatsappResult.success) {
        console.log(`[Notification] WhatsApp sent successfully for order ${order.orderId}.`);
        return await db.order.update({
          where: { id: order.id },
          data: { notificationStatus: "SENT" },
        });
      } else {
        console.error(`[Notification] WhatsApp notification failed for order ${order.orderId}:`, whatsappResult.error);
        return await db.order.update({
          where: { id: order.id },
          data: { notificationStatus: "FAILED" },
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Notification] Unexpected WhatsApp failure for order ${order.orderId}:`, errMsg);
      // Mark as FAILED in DB but keep paymentStatus as PAID
      return await db.order.update({
        where: { id: order.id },
        data: { notificationStatus: "FAILED" },
      });
    }
  }

  return updatedOrder;
}
