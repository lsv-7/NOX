"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, RefreshCw, CheckCircle, Clock, XCircle, 
  Send, AlertTriangle, ShieldCheck, CheckSquare, Layers 
} from "lucide-react";

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  pincode: string;
  quantity: number;
  amount: number;
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  paymentId: string | null;
  razorpayOrderId: string;
  orderStatus: "NEW" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  notificationStatus: "PENDING" | "SENT" | "FAILED";
  deliveryStatus: "NOT_SENT" | "SENT";
  createdAt: string;
}

export default function DeveloperConsole() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Webhook simulator states
  const [simWebhookOrderId, setSimWebhookOrderId] = useState("");
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error("Failed to load orders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateStatus = async (id: string, field: string, value: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          [field]: value,
        }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.ok) {
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || "Update failed");
      }
    } catch (e) {
      console.error("Error updating order:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAsSent = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryStatus: "SENT",
        }),
      });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (res.ok) {
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || "Update failed");
      }
    } catch (e) {
      console.error("Error marking order as sent:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/logout", {
        method: "POST",
      });
      if (res.ok) {
        router.push("/admin/login");
      } else {
        alert("Logout failed");
      }
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simWebhookOrderId) return;
    setWebhookLoading(true);
    setWebhookStatus(null);

    try {
      const payload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: `pay_mock_web_${Math.random().toString(36).substring(2, 9)}`,
              order_id: simWebhookOrderId,
            },
          },
        },
      };

      const res = await fetch("/api/orders/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": "mock_webhook_signature",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setWebhookStatus(`Success: Webhook processed successfully!`);
        fetchOrders();
      } else {
        setWebhookStatus(`Failed: ${data.error || "Webhook endpoint rejected request"}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setWebhookStatus(`Error: ${errMsg}`);
    } finally {
      setWebhookLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] p-4 md:p-8 text-[#171717]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-5">
          <div className="flex items-center gap-3">
            <Link 
              href="/admin" 
              className="p-2 hover:bg-[#E5E5E5] rounded-lg text-[#666666] hover:text-[#171717] transition-all"
              aria-label="Back to Owner Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-serif font-light text-[#171717] flex items-center gap-2">
                <Layers className="w-6 h-6 text-[#171717]" /> NOX Developer Console
              </h1>
              <p className="text-xs text-[#666666] mt-1 font-sans tracking-wide">Private gateway webhooks and persistent mock testing console</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#F7F7F5] rounded-lg text-xs font-semibold uppercase tracking-wider text-[#171717] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 border border-red-205 bg-[#FFFFFF] hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webhook Simulator Panel */}
          <div className="lg:col-span-1 bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-6 shadow-sm h-fit">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-[#171717] border-b border-[#E5E5E5] pb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#171717]" /> Webhook Simulator
            </h2>
            <p className="text-xs text-[#666666] font-light mt-3 leading-relaxed">
              Razorpay uses webhooks as the payment capture source. Enter a Razorpay Order ID to simulate an asynchronous payment capture.
            </p>

            <form onSubmit={handleSimulateWebhook} className="space-y-4 mt-5">
              <div>
                <label htmlFor="webhookOrderId" className="block text-[10px] uppercase tracking-wider font-semibold text-[#666666] mb-1.5">
                  Razorpay Order ID
                </label>
                <input
                  type="text"
                  id="webhookOrderId"
                  value={simWebhookOrderId}
                  onChange={(e) => setSimWebhookOrderId(e.target.value)}
                  placeholder="e.g. order_mock_xxx"
                  className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-[#171717] focus:outline-none focus:border-[#171717]"
                />
              </div>

              <button
                type="submit"
                disabled={webhookLoading || !simWebhookOrderId}
                className="w-full bg-[#171717] hover:bg-[#333333] text-[#FFFFFF] font-semibold py-2.5 px-4 rounded-lg text-xs uppercase tracking-widest transition-all disabled:bg-[#E5E5E5]"
              >
                {webhookLoading ? "Sending Webhook..." : "Trigger Mock Webhook"}
              </button>

              {webhookStatus && (
                <div className={`p-3 rounded-lg text-xs flex gap-2 items-start ${
                  webhookStatus.startsWith("Success") 
                    ? "bg-[#DEF7EC] border border-[#BCF0DA] text-[#03543F]" 
                    : "bg-[#FDE8E8] border border-[#FBD5D5] text-[#9B1C1C]"
                }`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{webhookStatus}</p>
                </div>
              )}
            </form>
          </div>

          {/* Orders Tracking Table */}
          <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-[#171717] p-6 border-b border-[#E5E5E5] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#171717]" /> Persistent Orders Database
            </h2>

            {loading ? (
              <div className="py-20 text-center text-xs text-neutral-400 font-light flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#171717]" />
                Loading records...
              </div>
            ) : orders.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#666666] font-light">
                No orders found in database. Create an order on the store first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F7F7F5] text-[#666666] uppercase text-[10px] tracking-wider border-b border-[#E5E5E5]">
                      <th className="py-3 px-4 font-semibold">IDs</th>
                      <th className="py-3 px-4 font-semibold">Customer</th>
                      <th className="py-3 px-4 font-semibold">Items & Cost</th>
                      <th className="py-3 px-4 font-semibold">Statuses</th>
                      <th className="py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {orders.map((order) => {
                      const unitPrice = order.amount / order.quantity;
                      const sizeLabel = unitPrice === 69900 ? "Small (15g)" : "Large (50g)";
                      
                      return (
                        <tr key={order.id} className="hover:bg-[#F7F7F5]/50 transition-all">
                          {/* IDs */}
                          <td className="py-4 px-4 space-y-1">
                            <p className="font-bold text-[#171717]">{order.orderId}</p>
                            <p className="text-[10px] text-[#666666] font-mono select-all">RZP: {order.razorpayOrderId}</p>
                            <p className="text-[9px] text-[#666666] font-light">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
                          </td>

                          {/* Customer Info */}
                          <td className="py-4 px-4">
                            <p className="font-medium text-[#171717]">{order.customerName}</p>
                            <p className="text-[10px] text-[#171717] font-medium">{order.phone}</p>
                            <p className="text-[9px] text-[#666666] truncate max-w-[150px]" title={order.address}>
                              {order.pincode} | {order.address}
                            </p>
                          </td>

                          {/* Quantity and Amount */}
                          <td className="py-4 px-4 space-y-0.5">
                            <p className="font-semibold text-[#171717]">{order.quantity} Jar(s) ({sizeLabel})</p>
                            <p className="text-[#666666]">₹{order.amount / 100}</p>
                          </td>

                          {/* Status Badges */}
                          <td className="py-4 px-4 space-y-1.5">
                            {/* Payment */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#666666] font-medium w-12">Pay:</span>
                              {order.paymentStatus === "PAID" ? (
                                <span className="bg-[#DEF7EC] text-[#03543F] px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 border border-[#BCF0DA]">
                                  <CheckCircle className="w-2.5 h-2.5" /> PAID
                                </span>
                              ) : order.paymentStatus === "FAILED" ? (
                                <span className="bg-[#FDE8E8] text-[#9B1C1C] px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 border border-[#FBD5D5]">
                                  <XCircle className="w-2.5 h-2.5" /> FAILED
                                </span>
                              ) : (
                                <span className="bg-[#FEF08A] text-[#713F12] px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 border border-[#FEF08A]">
                                  <Clock className="w-2.5 h-2.5" /> PENDING
                                </span>
                              )}
                            </div>

                            {/* WhatsApp */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#666666] font-medium w-12">WA Owner:</span>
                              {order.notificationStatus === "SENT" ? (
                                <span className="bg-[#DEF7EC] text-[#03543F] px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 border border-[#BCF0DA]">
                                  SENT
                                </span>
                              ) : order.notificationStatus === "FAILED" ? (
                                <span className="bg-[#FDE8E8] text-[#9B1C1C] px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 border border-[#FBD5D5]">
                                  FAILED
                                </span>
                              ) : (
                                <span className="bg-[#F3F4F6] text-[#374151] px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 border border-[#E5E5E5]">
                                  PENDING
                                </span>
                              )}
                            </div>

                            {/* Delivery */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#666666] font-medium w-12">Delivery:</span>
                              {order.deliveryStatus === "SENT" ? (
                                <span className="bg-[#E1F5FE] text-[#0288D1] px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 border border-[#B3E5FC]">
                                  SENT ✓
                                </span>
                              ) : (
                                <span className="bg-[#F3F4F6] text-[#374151] px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 border border-[#E5E5E5]">
                                  NOT SENT
                                </span>
                              )}
                            </div>

                            {/* Order status */}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#666666] font-medium w-12">Order:</span>
                              <span className="bg-[#F3F4F6] px-1.5 py-0.5 rounded text-[9px] font-semibold border border-[#E5E5E5] text-[#374151]">
                                {order.orderStatus}
                              </span>
                            </div>
                          </td>

                          {/* Actions dropdowns */}
                          <td className="py-4 px-4 space-y-2">
                            <div>
                              <select
                                value={order.orderStatus}
                                disabled={updatingId === order.id}
                                onChange={(e) => handleUpdateStatus(order.id, "orderStatus", e.target.value)}
                                className="text-[10px] bg-[#FFFFFF] border border-[#E5E5E5] rounded px-1 py-0.5 w-full focus:outline-none focus:border-[#171717] text-[#171717]"
                              >
                                <option value="NEW">NEW</option>
                                <option value="PACKED">PACKED</option>
                                <option value="SHIPPED">SHIPPED</option>
                                <option value="DELIVERED">DELIVERED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                            </div>

                            {order.paymentStatus === "PAID" && order.deliveryStatus === "NOT_SENT" && (
                              <button
                                type="button"
                                disabled={updatingId !== null}
                                onClick={() => handleMarkAsSent(order.orderId)}
                                className="w-full text-[9px] bg-[#171717] hover:bg-[#333333] text-[#FFFFFF] py-1 rounded font-semibold transition-all uppercase tracking-wider text-center"
                              >
                                Mark as Sent
                              </button>
                            )}

                            {order.paymentStatus === "PENDING" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSimWebhookOrderId(order.razorpayOrderId);
                                  document.getElementById("webhookOrderId")?.focus();
                                }}
                                className="w-full text-[9px] border border-[#E5E5E5] text-[#171717] hover:bg-[#F7F7F5] px-1.5 py-0.5 rounded font-semibold transition-all uppercase tracking-wider text-center"
                              >
                                Sim Webhook
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-4 text-xs text-[#666666] font-light flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-neutral-500 shrink-0" />
          <p>
            Secure, direct database mutations. Developer utilities are locked and restricted from standard operations.
          </p>
        </div>
      </div>
    </div>
  );
}
