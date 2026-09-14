import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CheckCircle2, ShieldCheck, Mail, ArrowRight } from "lucide-react";
import { OrderTimeline } from "@/components/OrderTimeline";
import { parseOrderItems } from "@/lib/order-utils";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;

  // Retrieve the order details
  const order = await db.order.findUnique({
    where: { orderId },
  });

  // Verify the order exists and is PAID
  if (!order || order.paymentStatus !== "PAID") {
    return notFound();
  }

  const parsedItems = parseOrderItems(order.items);
  const amountRupees = order.amount / 100;
  const shippingChargeInr = parseInt(process.env.NOX_SHIPPING_CHARGE_INR || "0", 10);
  const legacySubtotal = (order.amount - shippingChargeInr * 100) / 100;

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0E11] text-[#F5F0E6]">
      
      {/* Header */}
      <header className="border-b border-[rgba(212,167,44,0.22)] bg-[#0D0E11] py-5">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl tracking-[0.2em] font-light text-[#D4A72C]">
            NOX
          </Link>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#CFC5B4] font-semibold">Order Confirmed</span>
        </div>
      </header>

      {/* Main Success Layout */}
      <main className="flex-grow max-w-xl mx-auto px-6 w-full py-12 md:py-20 flex flex-col justify-center">
        <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-2xl p-8 md:p-12 shadow-2xl text-center animate-fadeIn">
          
          {/* Success Checkmark */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#0D0E11] rounded-full flex items-center justify-center border border-[#D4A72C]">
              <CheckCircle2 className="w-8 h-8 text-[#D4A72C]" />
            </div>
          </div>

          <h2 className="font-serif text-3xl font-light text-[#F5F0E6] tracking-wide">
            Order Confirmed ✓
          </h2>
          
          <p className="text-[#CFC5B4] font-light text-xs mt-3.5 leading-relaxed">
            Thank you for ordering from NOX. Your payment was successful, and we have received your order details.
          </p>

          {/* Unique Order ID badge */}
          <div className="my-8 inline-block bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-full px-6 py-2 text-xs font-semibold text-[#D4A72C] tracking-widest">
            ORDER ID: {order.orderId}
          </div>

          {/* Order Progress Timeline */}
          <div className="bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-2xl p-6 mb-8 text-left max-w-md mx-auto">
            <h4 className="text-[9px] uppercase tracking-[0.2em] font-semibold text-[#9D8751] border-b border-[rgba(212,167,44,0.22)] pb-2 mb-4">
              Order Status Timeline
            </h4>
            <OrderTimeline paymentStatus={order.paymentStatus} deliveryStatus={order.deliveryStatus} />
          </div>

          {/* Details breakdown */}
          <div className="border-t border-b border-[rgba(212,167,44,0.22)] py-6 text-left space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#D4A72C]">Shipment Details</h3>
            
            {/* Delivery address details */}
            <div className="text-xs text-[#CFC5B4] space-y-2 font-light leading-relaxed">
              <p><strong className="text-neutral-500">Customer Name:</strong> <span className="text-[#F5F0E6]">{order.customerName}</span></p>
              <p><strong className="text-neutral-500">Phone:</strong> <span className="text-[#F5F0E6]">{order.phone}</span></p>
              <p>
                <strong className="text-neutral-500">Address:</strong><br />
                <span className="inline-block mt-1 whitespace-pre-line text-[#F5F0E6] bg-[#0D0E11] px-3 py-2 rounded-lg w-full border border-[rgba(212,167,44,0.22)]">{order.address}</span>
              </p>
              <p><strong className="text-neutral-500">PIN code:</strong> <span className="text-[#F5F0E6]">{order.pincode}</span></p>
            </div>

            <h3 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#D4A72C] pt-3 border-t border-[rgba(212,167,44,0.22)]">Summary</h3>
            <div className="text-xs text-[#CFC5B4] space-y-2 font-light">
              {parsedItems && parsedItems.length > 0 ? (
                parsedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>NOX Night Cream ({item.size}) × {item.quantity}</span>
                    <span>₹{item.subtotal}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span>NOX Night Cream × {order.quantity}</span>
                  <span>₹{legacySubtotal}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery / Shipping</span>
                <span>{shippingChargeInr === 0 ? "Free" : `₹${shippingChargeInr}`}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#F5F0E6] pt-2 border-t border-[rgba(212,167,44,0.22)]">
                <span>Total Amount Paid</span>
                <span className="text-[#D4A72C]">₹{amountRupees}</span>
              </div>
            </div>
          </div>

          {/* Delivery Note */}
          <p className="text-neutral-500 font-light text-[10px] leading-relaxed mt-6">
            We will package your NOX skincare cream and hand it over to our courier partner shortly. Your order tracking dashboard will reflect shipping status updates once dispatched.
          </p>

          {/* Actions */}
          <div className="mt-8">
            <Link
              href="/"
              className="w-full bg-[#D4A72C] text-[#0D0E11] hover:bg-[#B88A20] transition-all duration-300 font-semibold py-3.5 px-6 rounded-full text-center text-xs uppercase tracking-[0.25em] shadow-sm flex items-center justify-center gap-2 border border-[#B88A20]"
            >
              Continue Shopping <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Security badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-neutral-500 font-light uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4A72C]" /> Secured
          </span>
          <span className="flex items-center gap-1 font-mono text-[9px]">
            <Mail className="w-3.5 h-3.5 text-[#D4A72C]" /> noxelitecosmetics@gmail.com
          </span>
        </div>
      </main>
    </div>
  );
}
