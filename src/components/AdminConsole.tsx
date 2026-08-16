"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, RefreshCw, CheckCircle, Clock, XCircle, 
  ShieldCheck, CheckSquare, Layers, ExternalLink 
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

export default function AdminConsole() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-[#F7F7F5] p-4 md:p-8 text-[#171717]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-5">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 hover:bg-[#E5E5E5] rounded-lg text-[#666666] hover:text-[#171717] transition-all"
              aria-label="Back to website"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-serif font-light text-[#171717] flex items-center gap-2">
                <Layers className="w-6 h-6 text-[#171717]" /> NOX Owner Dashboard
              </h1>
              <p className="text-xs text-[#666666] mt-1 font-sans tracking-wide">Order fulfillment and status management portal</p>
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

        {/* Clean Owner Dashboard Orders Table */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden flex flex-col w-full">
          <h2 className="text-sm uppercase tracking-wider font-semibold text-[#171717] p-6 border-b border-[#E5E5E5] flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#171717]" /> Active Customer Orders
          </h2>

          {loading ? (
            <div className="py-20 text-center text-xs text-neutral-400 font-light flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#171717]" />
              Loading records...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center text-xs text-[#666666] font-light">
              No orders found in database. Place an order on the store to populate dashboard.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F7F5] text-[#666666] uppercase text-[10px] tracking-wider border-b border-[#E5E5E5]">
                    <th className="py-4 px-4 font-semibold">Order Details</th>
                    <th className="py-4 px-4 font-semibold">Customer Info</th>
                    <th className="py-4 px-4 font-semibold">Product & Total</th>
                    <th className="py-4 px-4 font-semibold">Statuses</th>
                    <th className="py-4 px-4 font-semibold">Fulfillment Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {orders.map((order) => {
                    const unitPrice = order.amount / order.quantity;
                    const sizeLabel = unitPrice === 69900 ? "Small (15g)" : "Large (50g)";
                    
                    return (
                      <tr key={order.id} className="hover:bg-[#F7F7F5]/50 transition-colors">
                        
                        {/* Order Details */}
                        <td className="py-4 px-4 space-y-1">
                          <p className="font-bold text-[#171717] text-sm tracking-wide">{order.orderId}</p>
                          <p className="text-[10px] text-[#666666] font-mono select-all">Gateway RZP: {order.razorpayOrderId}</p>
                          <p className="text-[9px] text-[#666666] font-light">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
                        </td>

                        {/* Customer Info */}
                        <td className="py-4 px-4 space-y-1">
                          <p className="font-semibold text-[#171717]">{order.customerName}</p>
                          <p className="text-[10px] text-[#171717] font-medium">{order.phone}</p>
                          <p className="text-[10px] text-[#666666] leading-relaxed font-light" title={order.address}>
                            PIN: {order.pincode} | {order.address}
                          </p>
                        </td>

                        {/* Product Details */}
                        <td className="py-4 px-4 space-y-0.5">
                          <p className="font-medium text-[#171717]">NOX Cream ({sizeLabel})</p>
                          <p className="text-[#666666]">Qty: {order.quantity}</p>
                          <p className="font-semibold text-[#171717] text-sm">₹{order.amount / 100}</p>
                        </td>

                        {/* Statuses */}
                        <td className="py-4 px-4 space-y-2">
                          {/* Payment Status */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#666666] font-semibold w-16">Payment:</span>
                            {order.paymentStatus === "PAID" ? (
                              <span className="bg-[#DEF7EC] text-[#03543F] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 border border-[#BCF0DA]">
                                <CheckCircle className="w-2.5 h-2.5" /> PAID
                              </span>
                            ) : order.paymentStatus === "FAILED" ? (
                              <span className="bg-[#FDE8E8] text-[#9B1C1C] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 border border-[#FBD5D5]">
                                <XCircle className="w-2.5 h-2.5" /> FAILED
                              </span>
                            ) : (
                              <span className="bg-[#FEF08A] text-[#713F12] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 border border-[#FEF08A]">
                                <Clock className="w-2.5 h-2.5" /> PENDING
                              </span>
                            )}
                          </div>

                          {/* Order Flow State */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#666666] font-semibold w-16">Flow State:</span>
                            <span className="bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded text-[9px] font-bold border border-[#E5E5E5] uppercase tracking-wider">
                              {order.orderStatus}
                            </span>
                          </div>

                          {/* Delivery Status */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#666666] font-semibold w-16">Delivery:</span>
                            {order.deliveryStatus === "SENT" ? (
                              <span className="bg-[#E1F5FE] text-[#0288D1] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 border border-[#B3E5FC]">
                                SENT ✓
                              </span>
                            ) : (
                              <span className="bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 border border-[#E5E5E5]">
                                NOT SENT
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Fulfillment Actions */}
                        <td className="py-4 px-4 space-y-2.5">
                          {/* Flow Status Dropdown */}
                          <div>
                            <label className="block text-[8px] uppercase tracking-wider font-semibold text-[#666666] mb-1">
                              Modify flow state
                            </label>
                            <select
                              value={order.orderStatus}
                              disabled={updatingId === order.id}
                              onChange={(e) => handleUpdateStatus(order.id, "orderStatus", e.target.value)}
                              className="text-[10px] bg-[#FFFFFF] border border-[#E5E5E5] rounded px-2 py-1 w-full focus:outline-none focus:border-[#171717] text-[#171717]"
                            >
                              <option value="NEW">NEW</option>
                              <option value="PACKED">PACKED</option>
                              <option value="SHIPPED">SHIPPED</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </div>

                          {/* Mark As Sent Trigger */}
                          {order.paymentStatus === "PAID" && (
                            order.deliveryStatus === "NOT_SENT" ? (
                              <button
                                type="button"
                                disabled={updatingId !== null}
                                onClick={() => handleMarkAsSent(order.orderId)}
                                className="w-full text-[10px] bg-[#171717] hover:bg-[#333333] text-[#FFFFFF] py-1.5 rounded-lg font-semibold transition-all uppercase tracking-widest text-center shadow-sm"
                              >
                                Mark as Sent
                              </button>
                            ) : (
                              <div className="w-full text-[10px] text-[#0288D1] font-bold uppercase tracking-widest text-center py-1.5 bg-[#E1F5FE] rounded-lg border border-[#B3E5FC]">
                                SENT ✓
                              </div>
                            )
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

        {/* Info panel */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 text-xs text-[#666666] font-light flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-neutral-500 shrink-0" />
            <p>
              Direct, secure order management. Updates are instantly updated across tracking lookups.
            </p>
          </div>
          <div>
            <Link 
              href="/admin/developer" 
              className="text-[#171717] hover:text-[#666666] font-semibold transition-colors flex items-center gap-1 text-[11px]"
            >
              Developer Console <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
