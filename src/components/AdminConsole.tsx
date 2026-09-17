"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, RefreshCw, CheckCircle, Clock, XCircle, 
  ShieldCheck, CheckSquare, Layers, ExternalLink,
  Users, KeyRound, Eye, EyeOff, Search, AlertCircle
} from "lucide-react";
import { parseOrderItems } from "@/lib/order-utils";

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
  items?: string | null;
  createdAt: string;
}

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string;
  mustChangePassword: boolean;
}

export default function AdminConsole() {
  const router = useRouter();
  
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"orders" | "customers">("orders");

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Customers & Security state
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // Reset Password Modal state
  const [resetModalCustomer, setResetModalCustomer] = useState<CustomerItem | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoadingOrders(true);
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
      setLoadingOrders(false);
    }
  };

  const fetchCustomers = async (searchQuery?: string) => {
    setLoadingCustomers(true);
    try {
      const q = typeof searchQuery === "string" ? searchQuery : customerSearch;
      const url = q ? `/api/admin/customers?q=${encodeURIComponent(q.trim())}` : "/api/admin/customers";
      const res = await fetch(url);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error("Failed to load customers:", e);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (tab: "orders" | "customers") => {
    setActiveTab(tab);
    if (tab === "customers" && customers.length === 0) {
      fetchCustomers("");
    } else if (tab === "orders" && orders.length === 0) {
      fetchOrders();
    }
  };

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

  const handleOpenResetModal = (c: CustomerItem) => {
    setResetModalCustomer(c);
    setTempPassword("");
    setShowTempPassword(false);
    setResetError(null);
    setResetSuccess(null);
  };

  const handleCloseResetModal = () => {
    setResetModalCustomer(null);
    setTempPassword("");
    setShowTempPassword(false);
    setResetError(null);
    setResetSuccess(null);
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalCustomer) return;
    setResetError(null);
    setResetSuccess(null);

    if (!tempPassword || tempPassword.length < 8) {
      setResetError("Temporary password must be at least 8 characters long");
      return;
    }

    setResetSubmitting(true);
    try {
      const res = await fetch("/api/admin/customers/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: resetModalCustomer.id,
          newPassword: tempPassword,
        }),
      });

      const data = await res.json();
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (res.ok && data.success) {
        setResetSuccess(data.message || "Temporary password set successfully.");
        setTempPassword("");
        // Refresh customer list to show updated passwordChangedAt
        fetchCustomers();
      } else {
        setResetError(data.error || "Failed to reset password");
      }
    } catch (err) {
      console.error("Admin reset password error:", err);
      setResetError("Network error. Failed to reset password.");
    } finally {
      setResetSubmitting(false);
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
              <p className="text-xs text-[#666666] mt-1 font-sans tracking-wide">Fulfillment, customers, and security management portal</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeTab === "orders") fetchOrders();
                else fetchCustomers();
              }}
              disabled={loadingOrders || loadingCustomers}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#F7F7F5] rounded-lg text-xs font-semibold uppercase tracking-wider text-[#171717] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(loadingOrders || loadingCustomers) ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 border border-red-200 bg-[#FFFFFF] hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#E5E5E5] gap-4">
          <button
            type="button"
            onClick={() => handleTabChange("orders")}
            className={`pb-3 px-2 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "orders"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#666666] hover:text-[#171717]"
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Active Customer Orders ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("customers")}
            className={`pb-3 px-2 text-xs uppercase tracking-wider font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "customers"
                ? "border-[#171717] text-[#171717]"
                : "border-transparent text-[#666666] hover:text-[#171717]"
            }`}
          >
            <Users className="w-4 h-4" /> Customers &amp; Security
          </button>
        </div>

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden flex flex-col w-full">
            <h2 className="text-sm uppercase tracking-wider font-semibold text-[#171717] p-6 border-b border-[#E5E5E5] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#171717]" /> Active Customer Orders
            </h2>

            {loadingOrders ? (
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
                      <th className="py-4 px-4 font-semibold">Product &amp; Total</th>
                      <th className="py-4 px-4 font-semibold">Statuses</th>
                      <th className="py-4 px-4 font-semibold">Fulfillment Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {orders.map((order) => {
                      const parsedItems = parseOrderItems(order.items);
                      
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
                            {parsedItems && parsedItems.length > 0 ? (
                              <div className="space-y-1">
                                {parsedItems.map((item, idx) => (
                                  <p key={idx} className="text-[#171717] font-medium text-xs">
                                    {item.size} × {item.quantity} — ₹{item.subtotal}
                                  </p>
                                ))}
                                <p className="text-[#666666] text-[10px] pt-0.5 border-t border-[#E5E5E5] font-semibold">
                                  Total: {order.quantity} Jar{order.quantity > 1 ? "s" : ""} — ₹{order.amount / 100}
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="font-semibold text-[#171717]">{order.quantity} Jar{order.quantity > 1 ? "s" : ""}</p>
                                <p className="text-[#666666]">₹{order.amount / 100}</p>
                              </>
                            )}
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
        )}

        {/* CUSTOMERS & SECURITY TAB */}
        {activeTab === "customers" && (
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl shadow-sm overflow-hidden flex flex-col w-full">
            <div className="p-6 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm uppercase tracking-wider font-semibold text-[#171717] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#171717]" /> Customer Password Management
                </h2>
                <p className="text-xs text-[#666666] mt-1 font-light">
                  Search customers and perform secure admin-assisted password resets.
                </p>
              </div>

              {/* Search Box */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") fetchCustomers(customerSearch);
                    }}
                    placeholder="Search name, email, phone..."
                    className="pl-8 pr-3 py-1.5 text-xs border border-[#E5E5E5] rounded-lg focus:outline-none focus:border-[#171717] w-64 text-[#171717]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchCustomers(customerSearch)}
                  className="px-3 py-1.5 bg-[#171717] hover:bg-[#333333] text-[#FFFFFF] text-xs font-semibold rounded-lg uppercase tracking-wider transition-all"
                >
                  Search
                </button>
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch("");
                      fetchCustomers("");
                    }}
                    className="px-2.5 py-1.5 border border-[#E5E5E5] hover:bg-[#F7F7F5] text-[#666666] text-xs rounded-lg transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {loadingCustomers ? (
              <div className="py-20 text-center text-xs text-neutral-400 font-light flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#171717]" />
                Loading customers...
              </div>
            ) : customers.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#666666] font-light">
                {customerSearch ? "No matching customers found." : "No registered customers found in database."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F7F7F5] text-[#666666] uppercase text-[10px] tracking-wider border-b border-[#E5E5E5]">
                      <th className="py-4 px-4 font-semibold">Customer ID</th>
                      <th className="py-4 px-4 font-semibold">Customer Details</th>
                      <th className="py-4 px-4 font-semibold">Phone &amp; Email</th>
                      <th className="py-4 px-4 font-semibold">Last Password Change</th>
                      <th className="py-4 px-4 font-semibold">Status</th>
                      <th className="py-4 px-4 font-semibold">Security Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F7F7F5]/50 transition-colors">
                        <td className="py-4 px-4 font-mono text-[10px] text-[#666666] select-all">
                          {c.id}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-[#171717]">{c.name}</p>
                          <p className="text-[10px] text-[#666666]">Joined: {new Date(c.createdAt).toLocaleDateString("en-IN")}</p>
                        </td>
                        <td className="py-4 px-4 space-y-0.5">
                          <p className="text-[#171717] font-medium">{c.email}</p>
                          <p className="text-[10px] text-[#666666]">{c.phone}</p>
                        </td>
                        <td className="py-4 px-4 text-[10px] text-[#666666]">
                          {c.passwordChangedAt ? new Date(c.passwordChangedAt).toLocaleString("en-IN") : "Never changed"}
                        </td>
                        <td className="py-4 px-4">
                          {c.mustChangePassword ? (
                            <span className="bg-[#FEF08A] text-[#713F12] border border-[#FEF08A] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              Temporary Password (Pending)
                            </span>
                          ) : (
                            <span className="bg-[#DEF7EC] text-[#03543F] border border-[#BCF0DA] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(c)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171717] hover:bg-[#333333] text-[#FFFFFF] rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
                          >
                            <KeyRound className="w-3 h-3" /> Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* RESET PASSWORD MODAL */}
        {resetModalCustomer && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <h3 className="text-base font-semibold text-[#171717] flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#171717]" /> Reset Customer Password
                </h3>
                <button
                  onClick={handleCloseResetModal}
                  className="text-[#666666] hover:text-[#171717] text-lg font-light leading-none p-1"
                >
                  ✕
                </button>
              </div>

              {/* Target Customer Info */}
              <div className="bg-[#F7F7F5] rounded-xl p-3.5 text-xs space-y-1 border border-[#E5E5E5]">
                <p className="text-[#666666]">Target Customer:</p>
                <p className="font-bold text-[#171717] text-sm">{resetModalCustomer.name}</p>
                <p className="text-[#171717] font-medium">{resetModalCustomer.email} • {resetModalCustomer.phone}</p>
                <p className="text-[10px] text-[#666666] font-mono select-all">ID: {resetModalCustomer.id}</p>
              </div>

              {/* Security notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Setting a temporary password will <strong>immediately revoke all active sessions</strong> for this customer. Upon login, the customer will be required to choose a new permanent password.
                </p>
              </div>

              {resetSuccess ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{resetSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="w-full py-2.5 bg-[#171717] text-[#FFFFFF] rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#333333] transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAdminResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#171717] mb-1.5 uppercase tracking-wider">
                      Temporary Password (min. 8 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showTempPassword ? "text" : "password"}
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        placeholder="Enter temporary password"
                        required
                        minLength={8}
                        className="w-full pr-10 pl-3 py-2 text-xs border border-[#E5E5E5] rounded-lg focus:outline-none focus:border-[#171717] text-[#171717]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTempPassword(!showTempPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#171717]"
                        tabIndex={-1}
                      >
                        {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {resetError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseResetModal}
                      className="w-1/2 py-2.5 border border-[#E5E5E5] rounded-xl text-xs font-semibold text-[#666666] hover:bg-[#F7F7F5] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetSubmitting || tempPassword.length < 8}
                      className="w-1/2 py-2.5 bg-[#171717] hover:bg-[#333333] text-[#FFFFFF] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {resetSubmitting ? "Resetting..." : "Confirm Reset"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Info panel */}
        <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-5 text-xs text-[#666666] font-light flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-neutral-500 shrink-0" />
            <p>
              Direct, secure order and customer management. Password resets use bcrypt (12 rounds) and enforce session revocation.
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
