import Razorpay from "razorpay";
import crypto from "crypto";

const isMockMode = process.env.NODE_ENV !== "production" && process.env.NOX_MOCK_MODE === "true";

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, unknown>;
  created_at: number;
}

export const razorpayHelper = {
  async createOrder(amountPaise: number, receiptId: string): Promise<RazorpayOrder> {
    if (isMockMode) {
      // Simulate order creation in mock mode
      return {
        id: `order_mock_${Math.random().toString(36).substring(2, 15)}`,
        entity: "order",
        amount: amountPaise,
        amount_paid: 0,
        amount_due: amountPaise,
        currency: "INR",
        receipt: receiptId,
        status: "created",
        attempts: 0,
        notes: {},
        created_at: Math.floor(Date.now() / 1000),
      };
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay API credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing.");
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: receiptId,
    };

    const order = await instance.orders.create(options);
    return order as RazorpayOrder;
  },

  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    if (isMockMode) {
      // Simple mock verification check
      return razorpaySignature === "mock_signature" || razorpaySignature.startsWith("mock_sig_");
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Razorpay secret key is missing.");
    }

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const actualBuf = Buffer.from(razorpaySignature, "utf-8");

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  },

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (isMockMode) {
      // Always verify webhook in mock mode if header is present
      return signature === "mock_webhook_signature" || signature.startsWith("mock_web_");
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Razorpay webhook secret (RAZORPAY_WEBHOOK_SECRET) is missing.");
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const actualBuf = Buffer.from(signature, "utf-8");

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  },
};
