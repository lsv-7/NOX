import fs from "fs";
import path from "path";
import { Order } from "./db";

const isMockMode = process.env.NOX_MOCK_MODE === "true";
const NOTIFICATIONS_LOG_PATH = path.join(process.cwd(), "nox_sent_notifications.log");

/**
 * Formats a clean, human-readable text message containing the complete order details.
 */
export function formatOrderMessage(order: Order): string {
  // Convert amount in paise back to rupees for display
  const amountRupees = order.amount / 100;
  
  return `🛍️ *NEW NOX ORDER*

*Order ID:* ${order.orderId}
*Customer:* ${order.customerName}
*Phone:* ${order.phone}
*Quantity:* ${order.quantity}
*Amount:* ₹${amountRupees}
*Payment:* ✅ PAID

*Delivery Address:*
${order.address}

*Pincode:* ${order.pincode}`;
}

/**
 * Sends a WhatsApp notification to the owner about a new paid order.
 * If in mock mode, saves the formatted message to a local file.
 */
export async function sendWhatsAppNotification(order: Order): Promise<{ success: boolean; error?: string }> {
  const messageText = formatOrderMessage(order);

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const recipient = process.env.OWNER_PHONE_NUMBER || "";

  const isMockCredentials =
    !phoneId ||
    !token ||
    !recipient ||
    phoneId.includes("mock") ||
    token.includes("mock") ||
    recipient.includes("9999999999");

  if (isMockMode || isMockCredentials) {
    if (process.env.MOCK_WHATSAPP_FAILURE === "true") {
      return { success: false, error: "Simulated mock WhatsApp failure" };
    }
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ORDER ${order.orderId} NOTIFICATION SENT:\n${messageText}\n----------------------------------------\n`;
      fs.appendFileSync(NOTIFICATIONS_LOG_PATH, logEntry, "utf-8");
      
      console.log("\n================ MOCK WHATSAPP NOTIFICATION ===============");
      console.log("Status: WhatsApp is running in mock mode (mock credentials detected).");
      console.log(messageText);
      console.log("===========================================================\n");
      
      return { success: true };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      return { success: false, error: `Mock write failed: ${errMsg}` };
    }
  }

  try {
    // Note: The template configuration below is structured for standard Meta WhatsApp Cloud API templates.
    // In production, the owner will register an approved template (e.g., 'new_nox_order') with Meta,
    // and pass the order details as parameters.
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "new_nox_order";
    const amountRupeesStr = (order.amount / 100).toString();

    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en",
          },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: order.orderId },
                { type: "text", text: order.customerName },
                { type: "text", text: order.phone },
                { type: "text", text: order.quantity.toString() },
                { type: "text", text: `₹${amountRupeesStr}` },
                { type: "text", text: order.address },
                { type: "text", text: order.pincode },
              ],
            },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: `Meta WhatsApp API error: ${JSON.stringify(data.error || data)}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Network/API connection failure: ${errMsg}`,
    };
  }
}
