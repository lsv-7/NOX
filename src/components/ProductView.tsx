"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Plus, Minus, ShieldCheck, Truck, AlertCircle, Loader2 } from "lucide-react";
import { OrderTimeline } from "./OrderTimeline";

interface ProductViewProps {
  productPriceInr: number;
  shippingChargeInr: number;
  isMockMode: boolean;
}

interface LocalSavedOrder {
  orderId: string;
  phone: string;
}

export default function ProductView({
  shippingChargeInr,
  isMockMode,
}: ProductViewProps) {
  const router = useRouter();
  const checkoutRef = useRef<HTMLDivElement>(null);

  // Selected Size Variant State
  const [selectedSize, setSelectedSize] = useState<"Small" | "Large">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("nox_checkout_pending");
        if (saved) return JSON.parse(saved).size || "Large";
      } catch {}
    }
    return "Large";
  });

  // Core checkout states - initialized lazily from sessionStorage
  const [quantity, setQuantity] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("nox_checkout_pending");
        if (saved) return JSON.parse(saved).quantity || 1;
      } catch {}
    }
    return 1;
  });

  const [customerName, setCustomerName] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("nox_checkout_pending");
        if (saved) return JSON.parse(saved).customerName || "";
      } catch {}
    }
    return "";
  });

  const [phone, setPhone] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("nox_checkout_pending");
        if (saved) return JSON.parse(saved).phone || "";
      } catch {}
    }
    return "";
  });

  const [address, setAddress] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("nox_checkout_pending");
        if (saved) return JSON.parse(saved).address || "";
      } catch {}
    }
    return "";
  });

  const [pincode, setPincode] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("nox_checkout_pending");
        if (saved) return JSON.parse(saved).pincode || "";
      } catch {}
    }
    return "";
  });

  // UI/Flow states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showMockModal, setShowMockModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"benefits" | "howToUse" | "ingredients">("benefits");
  
  // Pending order state for mock flow
  const [pendingRazorpayOrderId, setPendingRazorpayOrderId] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // Tracking Panel States
  interface TrackedOrderItem {
    orderId: string;
    amount: number;
    paymentStatus: string;
    deliveryStatus: string;
    createdAt: string;
  }

  const [trackedOrders, setTrackedOrders] = useState<TrackedOrderItem[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  
  // Manual Import Form States
  const [importOrderId, setImportOrderId] = useState("");
  const [importPhone, setImportPhone] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const fetchTrackedOrders = async () => {
    try {
      const saved = localStorage.getItem("nox_my_orders");
      if (!saved) return;
      const list = JSON.parse(saved);
      if (!Array.isArray(list) || list.length === 0) return;
      
      setTrackingLoading(true);
      setTrackingError(null);
      
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: list }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setTrackedOrders(data.orders || []);
      } else {
        setTrackingError(data.error || "Failed to load order tracking details");
      }
    } catch (err) {
      console.error("Tracking fetch error:", err);
      setTrackingError("Failed to connect to tracking service");
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTrackedOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Clear session storage and scroll if restored on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedState = sessionStorage.getItem("nox_checkout_pending");
        if (savedState) {
          sessionStorage.removeItem("nox_checkout_pending");
          setTimeout(() => {
            checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 300);
        }
      } catch (e) {
        console.error("Failed to clean up checkout state:", e);
      }
    }
  }, []);

  // Variant price settings
  const productPrice = selectedSize === "Small" ? 699 : 1299;
  const subtotal = productPrice * quantity;
  const total = subtotal + shippingChargeInr;

  // Validation functions
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!customerName.trim()) {
      errors.customerName = "Full Name is required";
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errors.phone = "Mobile Number is required";
    } else if (!/^(?:\+91|91|0)?[6-9]\d{9}$/.test(trimmedPhone)) {
      errors.phone = "Please enter a valid 10-digit Indian mobile number";
    }

    if (!address.trim()) {
      errors.address = "Delivery address is required";
    }

    const trimmedPincode = pincode.trim();
    if (!trimmedPincode) {
      errors.pincode = "PIN code is required";
    } else if (!/^\d{6}$/.test(trimmedPincode)) {
      errors.pincode = "PIN code must be exactly 6 digits";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const scrollToCheckout = () => {
    checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Main checkout submission handler
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Call server API to create Order with selected size
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          address,
          pincode,
          quantity,
          size: selectedSize,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize order");
      }

      // Save user details to sessionStorage for payment failure retry state preservation
      const checkoutState = { customerName, phone, address, pincode, quantity, size: selectedSize };
      sessionStorage.setItem("nox_checkout_pending", JSON.stringify(checkoutState));

      if (isMockMode) {
        // Mock Mode payment simulation
        setPendingRazorpayOrderId(data.razorpayOrderId);
        setPendingOrderId(data.orderId);
        setShowMockModal(true);
        setIsSubmitting(false);
      } else {
        // Live Razorpay payment overlay
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: "INR",
          name: "NOX",
          description: `NOX Skincare Cream (${selectedSize}) x ${quantity}`,
          order_id: data.razorpayOrderId,
          handler: async function (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) {
            setIsSubmitting(true);
            try {
              // Call API to verify payment
              const verifyRes = await fetch("/api/orders/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                sessionStorage.removeItem("nox_checkout_pending");

                // Save order details to localStorage list
                try {
                  const saved = localStorage.getItem("nox_my_orders");
                  const list: LocalSavedOrder[] = saved ? JSON.parse(saved) : [];
                  if (!list.some((o) => o.orderId === verifyData.orderId)) {
                    list.push({ orderId: verifyData.orderId, phone: phone.trim() });
                    localStorage.setItem("nox_my_orders", JSON.stringify(list));
                  }
                } catch (e) {
                  console.error("Local storage error:", e);
                }

                router.push(`/order-confirmation/${verifyData.orderId}`);
              } else {
                router.push("/payment-failure");
              }
            } catch (err) {
              console.error("Verification error:", err);
              router.push("/payment-failure");
            } finally {
              setIsSubmitting(false);
            }
          },
          prefill: {
            name: customerName,
            contact: phone,
          },
          theme: {
            color: "#11152F",
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function () {
          router.push("/payment-failure");
        });
        rzp.open();
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      console.error("Order creation error:", err);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      alert(errMsg || "An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Mock payment verification simulation
  const handleSimulateSuccess = async () => {
    if (!pendingRazorpayOrderId || !pendingOrderId) return;
    setShowMockModal(false);
    setIsSubmitting(true);

    try {
      const verifyRes = await fetch("/api/orders/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: pendingRazorpayOrderId,
          razorpayPaymentId: "pay_mock_" + Math.random().toString(36).substring(2, 9),
          razorpaySignature: "mock_signature",
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        sessionStorage.removeItem("nox_checkout_pending");

        try {
          const saved = localStorage.getItem("nox_my_orders");
          const list: LocalSavedOrder[] = saved ? JSON.parse(saved) : [];
          if (!list.some((o) => o.orderId === verifyData.orderId)) {
            list.push({ orderId: verifyData.orderId, phone: phone.trim() });
            localStorage.setItem("nox_my_orders", JSON.stringify(list));
          }
        } catch (e) {
          console.error("Local storage error:", e);
        }

        router.push(`/order-confirmation/${verifyData.orderId}`);
      } else {
        router.push("/payment-failure");
      }
    } catch (err) {
      console.error("Mock verification error:", err);
      router.push("/payment-failure");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateFailure = () => {
    setShowMockModal(false);
    router.push("/payment-failure");
  };

  // Manual Import Form Handler
  const handleImportOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importOrderId.trim() || !importPhone.trim()) {
      setImportError("Both Order ID and Phone Number are required");
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportSuccess(false);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: importOrderId.trim(),
          phone: importPhone.trim()
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportSuccess(true);
        setImportOrderId("");
        setImportPhone("");
        
        try {
          const saved = localStorage.getItem("nox_my_orders");
          const list: LocalSavedOrder[] = saved ? JSON.parse(saved) : [];
          if (!list.some((o) => o.orderId === data.order.orderId)) {
            list.push({ orderId: data.order.orderId, phone: data.order.phone || importPhone.trim() });
            localStorage.setItem("nox_my_orders", JSON.stringify(list));
          }
        } catch (e) {
          console.error("Local storage error:", e);
        }
        
        fetchTrackedOrders();
      } else {
        setImportError(data.error || "Order not found or details don't match.");
      }
    } catch (err) {
      console.error("Import error:", err);
      setImportError("Failed to connect to verification servers.");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Main Lavish Product Presentation (DARK - Charcoal Background) */}
      <section className="bg-[#0D0E11] border-b border-[rgba(212,167,44,0.22)] w-full py-16 md:py-24 animate-fadeIn">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          
          {/* Left Column: Premium Framed Product Image with Smooth Transition */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] group transition-all duration-700">
            {/* Small (15g) image */}
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${selectedSize === "Small" ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
              <Image
                src="/images/nox_15g.jpg"
                alt="NOX Premium Skincare Night Cream (15g)"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            {/* Large (50g) image */}
            <div className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${selectedSize === "Large" ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
              <Image
                src="/images/nox_50g.jpg"
                alt="NOX Premium Skincare Night Cream (50g)"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </div>

          {/* Right Column: Hero Details & Buy CTA */}
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#D4A72C] font-semibold">Exquisite Treatment</span>
                <span className="h-[1px] w-8 bg-[rgba(212,167,44,0.22)]"></span>
              </div>
              
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light tracking-wide text-[#F5F0E6] leading-tight">
                NOX
              </h1>
              <p className="font-serif text-lg text-[#D4A72C] font-light tracking-wider mt-1.5 uppercase">
                THE NIGHT RITUAL
              </p>
              
              <p className="mt-6 text-[#CFC5B4] font-light leading-relaxed text-sm">
                A refined skincare experience designed for your nightly routine. Formulated to work with your skin&apos;s biological cycle, NOX delivers intensive overnight moisture, repairing boundaries and refining skin texture. An elegant ritual to wake up with deeply recharged, luminous skin.
              </p>
            </div>

            {/* Selectable Variants Section */}
            <div className="mt-8 pt-6 border-t border-[rgba(212,167,44,0.22)]">
              <span className="block text-[10px] uppercase tracking-[0.2em] text-[#9D8751] font-semibold mb-3.5">
                Select Size Variant
              </span>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Small Variant */}
                <button
                  type="button"
                  onClick={() => setSelectedSize("Small")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                    selectedSize === "Small"
                      ? "bg-[#0D0E11] border-[#D4A72C] text-[#F5F0E6] shadow-md shadow-[#D4A72C]/5"
                      : "bg-[#08090B] border-[rgba(212,167,44,0.22)] text-[#CFC5B4] hover:border-[#9D8751]"
                  }`}
                >
                  <span className="text-xs uppercase tracking-widest font-semibold font-sans">SMALL — 15g</span>
                  <span className={`text-sm font-serif mt-1 ${selectedSize === "Small" ? "text-[#D4A72C]" : "text-[#CFC5B4]"}`}>₹699</span>
                  {selectedSize === "Small" ? (
                    <span className="text-[9px] uppercase tracking-wider text-[#D4A72C] mt-1.5 font-bold font-sans">SELECTED</span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-wider text-transparent mt-1.5 font-bold font-sans">UNSELECTED</span>
                  )}
                </button>

                {/* Large Variant */}
                <button
                  type="button"
                  onClick={() => setSelectedSize("Large")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                    selectedSize === "Large"
                      ? "bg-[#0D0E11] border-[#D4A72C] text-[#F5F0E6] shadow-md shadow-[#D4A72C]/5"
                      : "bg-[#08090B] border-[rgba(212,167,44,0.22)] text-[#CFC5B4] hover:border-[#9D8751]"
                  }`}
                >
                  <span className="text-xs uppercase tracking-widest font-semibold font-sans">LARGE — 50g</span>
                  <span className={`text-sm font-serif mt-1 ${selectedSize === "Large" ? "text-[#D4A72C]" : "text-[#CFC5B4]"}`}>₹1,299</span>
                  {selectedSize === "Large" ? (
                    <span className="text-[9px] uppercase tracking-wider text-[#D4A72C] mt-1.5 font-bold font-sans">SELECTED</span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-wider text-transparent mt-1.5 font-bold font-sans">UNSELECTED</span>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6">
              {/* Quantity Selector */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#CFC5B4] font-semibold">Quantity</span>
                <div className="flex items-center border border-[rgba(212,167,44,0.22)] rounded-full bg-[#08090B] px-2.5 py-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1 text-[#D4A72C] hover:text-[#F5F0E6] transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-xs font-semibold w-8 text-center text-[#F5F0E6]">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1 text-[#D4A72C] hover:text-[#F5F0E6] transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Order pricing details row */}
              <div className="flex justify-between items-baseline mb-4 text-[#CFC5B4] text-xs font-light">
                <span>Total Cost ({selectedSize === "Small" ? "15g" : "50g"}):</span>
                <span className="text-[#D4A72C] font-serif text-2xl font-semibold">₹{total}</span>
              </div>

              {/* Primary Buy CTA */}
              <button
                onClick={scrollToCheckout}
                className="w-full bg-[#D4A72C] hover:bg-[#B88A20] text-[#0D0E11] transition-all duration-300 font-semibold py-4 px-8 rounded-full text-center text-xs uppercase tracking-[0.25em] shadow-lg shadow-[#D4A72C]/10 border border-[#B88A20]"
              >
                BUY NOW
              </button>

              <div className="mt-4 flex items-center justify-center gap-6 text-[10px] text-neutral-500 font-light tracking-wide uppercase">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4A72C]" /> Secured
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#D4A72C]" /> Direct Shipping
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Tabs Section: Product Information Details (LIGHT - Warm Ivory Background) */}
      <div className="bg-[#F5F0E6] text-[#34302A] border-b border-[#CFC5B4]">
        <div className="max-w-6xl mx-auto px-6">
          <section className="py-16">
            <div className="flex border-b border-[#CFC5B4] justify-start space-x-8 text-xs mb-8 font-light uppercase tracking-[0.2em] text-[#9D8751]">
              <button
                type="button"
                onClick={() => setActiveTab("benefits")}
                className={`pb-2.5 transition-all font-semibold ${
                  activeTab === "benefits"
                    ? "border-b-2 border-[#0D0E11] text-[#0D0E11]"
                    : "hover:text-[#111111]"
                }`}
              >
                Benefits
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("howToUse")}
                className={`pb-2.5 transition-all font-semibold ${
                  activeTab === "howToUse"
                    ? "border-b-2 border-[#0D0E11] text-[#0D0E11]"
                    : "hover:text-[#111111]"
                }`}
              >
                How to Use
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ingredients")}
                className={`pb-2.5 transition-all font-semibold ${
                  activeTab === "ingredients"
                    ? "border-b-2 border-[#0D0E11] text-[#0D0E11]"
                    : "hover:text-[#111111]"
                }`}
              >
                Ingredients
              </button>
            </div>

            <div className="text-[#34302A] font-light text-sm leading-relaxed max-w-2xl">
              {activeTab === "benefits" && (
                <div className="space-y-3">
                  <p className="italic text-xs text-neutral-450 mb-3">[Skincare benefits statement]</p>
                  <ul className="list-disc list-inside space-y-2 text-[#34302A]">
                    <li>Formulated with botanical precision for overnight moisture reinforcement.</li>
                    <li>Supports skin renewal and targets natural barrier repair.</li>
                    <li>Sinks in quickly without leaving heavy or greasy boundaries.</li>
                    <li>Hypoallergenic composition tested for all Indian skin profiles.</li>
                  </ul>
                </div>
              )}
              
              {activeTab === "howToUse" && (
                <div className="space-y-2">
                  <p className="italic text-xs text-neutral-450 mb-3">[Application guide details]</p>
                  <ol className="list-decimal list-inside space-y-2 text-[#34302A]">
                    <li>Cleanse face thoroughly and pat dry with an ivory cloth.</li>
                    <li>Apply a small, refined pearl-sized portion of NOX.</li>
                    <li>Gently massage upwards until absorbed fully.</li>
                    <li>Complete nightly for dynamic overnight cell restoration.</li>
                  </ol>
                </div>
              )}
              
              {activeTab === "ingredients" && (
                <div className="bg-white p-6 rounded-xl border border-[#CFC5B4] text-xs">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-[#F5F0E6] text-[#0D0E11] border border-[#CFC5B4] px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold">Hyaluronic Acid</span>
                    <span className="bg-[#F5F0E6] text-[#0D0E11] border border-[#CFC5B4] px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold">Ceramides</span>
                    <span className="bg-[#F5F0E6] text-[#0D0E11] border border-[#CFC5B4] px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold">Niacinamide</span>
                    <span className="bg-[#F5F0E6] text-[#0D0E11] border border-[#CFC5B4] px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold">Retinol</span>
                  </div>
                  <p className="italic text-[9px] text-[#9D8751] mb-2">[Skincare formulation credentials]</p>
                  <p className="text-[#34302A] font-mono leading-relaxed select-all">
                    Aqua, Caprylic/Capric Triglyceride, Glycerin, Cetear Alcohol, Glyceryl Stearate, PEG-100 Stearate, Dimethicone, Phenoxyethanol, Ethylhexylglycerin, Disodium EDTA, Parfum.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Checkout Form Section (LIGHT background - DARK card container) */}
      <section
        id="checkout"
        ref={checkoutRef}
        className="py-16 md:py-24 bg-[#F5F0E6] text-[#F5F0E6] scroll-mt-20 w-full"
      >
        <div className="max-w-xl mx-auto px-6">
          <div className="bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-2xl p-6 md:p-10 shadow-2xl">
            <div className="text-center mb-8">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#D4A72C] font-semibold">Fulfillment Checkout</span>
              <h2 className="font-serif text-3xl font-light text-[#F5F0E6] mt-1 tracking-wide">Fulfillment Order</h2>
              <p className="text-xs text-[#CFC5B4] mt-2">Complete details to request direct shipment.</p>
            </div>

            {/* Premium High-Contrast Order Summary Card */}
            <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] p-5 rounded-xl mb-8 space-y-3.5 text-xs text-[#CFC5B4]">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#F5F0E6] border-b border-[rgba(212,167,44,0.22)] pb-2 mb-2.5">
                ORDER SUMMARY
              </h3>
              
              <div className="space-y-2.5 font-normal text-[#CFC5B4]">
                <p className="font-semibold text-[#F5F0E6] text-sm">NOX Night Cream</p>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span className="text-[#F5F0E6] font-medium">{selectedSize === "Small" ? "15g" : "50g"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span className="text-[#F5F0E6] font-medium">{quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unit Price:</span>
                  <span className="text-[#F5F0E6] font-medium">₹{selectedSize === "Small" ? 699 : 1299}</span>
                </div>
                <div className="flex justify-between border-t border-[rgba(212,167,44,0.22)] pt-2.5 mt-1">
                  <span>Subtotal:</span>
                  <span className="text-[#F5F0E6] font-semibold">₹{subtotal}</span>
                </div>
              </div>
              
              <div className="flex justify-between text-[#CFC5B4] pb-2 border-b border-[rgba(212,167,44,0.22)]">
                <span>Shipping</span>
                <span className="text-[#D4A72C] font-bold uppercase tracking-wider">FREE</span>
              </div>
              
              <div className="flex justify-between items-baseline pt-2.5 text-[#F5F0E6]">
                <span className="font-bold uppercase tracking-wider text-[10px]">TOTAL AMOUNT</span>
                <span className="font-serif text-xl font-bold text-[#D4A72C]">₹{total}</span>
              </div>
            </div>

            <form onSubmit={handleProceedToPayment} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="customerName" className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                  Full Name
                </label>
                <input
                  type="text"
                  id="customerName"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (formErrors.customerName) setFormErrors({ ...formErrors, customerName: "" });
                  }}
                  placeholder="Enter your full name"
                  className="w-full bg-[#08090B] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C]/40"
                />
                {formErrors.customerName && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-450">
                    <AlertCircle className="w-3.5 h-3.5" /> {formErrors.customerName}
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label htmlFor="phone" className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                  Mobile Number (India)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: "" });
                  }}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-[#08090B] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C]/40"
                />
                {formErrors.phone && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-450">
                    <AlertCircle className="w-3.5 h-3.5" /> {formErrors.phone}
                  </p>
                )}
              </div>

              {/* Delivery Address */}
              <div>
                <label htmlFor="address" className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                  Delivery Address
                </label>
                <textarea
                  id="address"
                  rows={3}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (formErrors.address) setFormErrors({ ...formErrors, address: "" });
                  }}
                  placeholder="House details, building details, street details, pincode, city, state"
                  className="w-full bg-[#08090B] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] resize-none focus:outline-none focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C]/40"
                />
                {formErrors.address && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-450">
                    <AlertCircle className="w-3.5 h-3.5" /> {formErrors.address}
                  </p>
                )}
              </div>

              {/* Pincode & Quantity Selector Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Pincode */}
                <div>
                  <label htmlFor="pincode" className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                    PIN code
                  </label>
                  <input
                    type="text"
                    id="pincode"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value.replace(/\D/g, ""));
                      if (formErrors.pincode) setFormErrors({ ...formErrors, pincode: "" });
                    }}
                    placeholder="6-digit PIN code"
                    className="w-full bg-[#08090B] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C]/40"
                  />
                  {formErrors.pincode && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-450">
                      <AlertCircle className="w-3.5 h-3.5" /> {formErrors.pincode}
                    </p>
                  )}
                </div>

                {/* Shipping cost indicator */}
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                    Shipping Charge
                  </span>
                  <div className="w-full bg-[#08090B] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#D4A72C] font-semibold uppercase tracking-wider">
                    FREE DELIVERY
                  </div>
                </div>
              </div>

              {/* Proceed Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#D4A72C] hover:bg-[#B88A20] text-[#0D0E11] font-semibold py-4 px-8 rounded-full text-center text-xs uppercase tracking-[0.25em] shadow-md transition-all border border-[#B88A20] flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> SECURING CHECKOUT...
                  </>
                ) : (
                  "SECURE CHECKOUT"
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Customer Tracking Section (LIGHT - Warm Ivory Surface with Dark Cards Container) */}
      <section id="tracking" className="bg-[#F5F0E6] max-w-6xl mx-auto px-6 py-20 border-t border-[#CFC5B4] scroll-mt-20 text-[#151515]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Tracking History / Previous Orders */}
          <div className="md:col-span-2 bg-white border border-[#CFC5B4] rounded-2xl p-6 shadow-md">
            <h3 className="font-serif text-xl font-light text-[#0D0E11] mb-4">My Tracked Orders</h3>
            
            {trackingLoading ? (
              <div className="py-12 text-center text-xs text-neutral-500 font-light flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4A72C]" /> Loading tracked orders...
              </div>
            ) : trackingError ? (
              <div className="py-12 text-center text-xs text-rose-700 font-light">
                {trackingError}
              </div>
            ) : trackedOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-550 font-light">
                No orders tracked on this device. Place a successful order or import one.
              </div>
            ) : (
              <div className="space-y-4">
                {trackedOrders.map((order) => {
                  return (
                    <div key={order.orderId} className="flex flex-col border border-[rgba(212,167,44,0.22)] rounded-xl p-6 bg-[#0D0E11] text-xs text-[#F5F0E6]">
                      <div className="flex justify-between items-start border-b border-[rgba(212,167,44,0.22)] pb-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#F5F0E6]">{order.orderId}</span>
                            <span className="text-[10px] text-[#9D8751] font-light">
                              {new Date(order.createdAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                          <div className="text-[#CFC5B4] font-medium">
                            Amount: <span className="text-[#D4A72C]">₹{order.amount / 100}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => router.push(`/order-confirmation/${order.orderId}`)}
                          className="border border-[#B88A20] text-[#D4A72C] hover:bg-[#D4A72C] hover:text-[#0D0E11] px-4 py-1.5 rounded-full text-[9px] font-bold tracking-wider uppercase transition-all"
                        >
                          View Order
                        </button>
                      </div>

                      {/* Progress Timeline */}
                      <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-xl p-4">
                        <OrderTimeline paymentStatus={order.paymentStatus} deliveryStatus={order.deliveryStatus} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Import / Track Form */}
          <div className="md:col-span-1 bg-white border border-[#CFC5B4] rounded-2xl p-6 shadow-md">
            <h3 className="font-serif text-lg font-light text-[#0D0E11] mb-2">Import Tracking</h3>
            <p className="text-[#34302A] font-light text-[11px] leading-relaxed mb-4">
              Access order progress or import status details placed on another device.
            </p>
            
            <form onSubmit={handleImportOrder} className="space-y-4">
              <div>
                <label htmlFor="importOrderId" className="block text-3xs uppercase tracking-wider text-[#34302A] mb-1 font-semibold">
                  Order ID
                </label>
                <input
                  type="text"
                  id="importOrderId"
                  value={importOrderId}
                  onChange={(e) => {
                    setImportOrderId(e.target.value);
                    setImportSuccess(false);
                    setImportError(null);
                  }}
                  placeholder="e.g. NOX-00001"
                  required
                  className="w-full text-xs bg-[#F5F0E6] border border-[#CFC5B4] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#D4A72C] text-[#171717] placeholder-[#8A857C] transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="importPhone" className="block text-3xs uppercase tracking-wider text-[#34302A] mb-1 font-semibold">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  id="importPhone"
                  value={importPhone}
                  onChange={(e) => {
                    setImportPhone(e.target.value);
                    setImportSuccess(false);
                    setImportError(null);
                  }}
                  placeholder="e.g. 9876543210"
                  required
                  className="w-full text-xs bg-[#F5F0E6] border border-[#CFC5B4] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#D4A72C] text-[#171717] placeholder-[#8A857C] transition-all"
                />
              </div>

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-2xs flex gap-2 items-start leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-2xs leading-relaxed">
                  ✓ Order imported and verified successfully!
                </div>
              )}

              <button
                type="submit"
                disabled={importLoading}
                className="w-full bg-[#0D0E11] text-[#F5F0E6] hover:bg-[#D4A72C] hover:text-[#0D0E11] border border-[#B88A20] font-semibold py-2.5 rounded-full text-xs uppercase tracking-widest transition-all disabled:bg-[#CFC5B4]"
              >
                {importLoading ? "Verifying..." : "Track / Import"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Mock Payment Simulation Modal */}
      {showMockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08090B]/85 backdrop-blur-sm">
          <div className="bg-[#0D0E11] border border-[#D4A72C] max-w-sm w-full rounded-2xl p-6 shadow-2xl text-center space-y-6">
            <div className="w-12 h-12 bg-[#08090B] rounded-full flex items-center justify-center border border-[#D4A72C] mx-auto">
              <ShieldCheck className="w-5 h-5 text-[#D4A72C]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-serif text-xl text-[#F5F0E6] font-light">Simulate Payment Gateway</h3>
              <p className="text-[11px] text-[#CFC5B4] font-light leading-relaxed">
                Choose the payment status outcome for mock order <span className="font-semibold text-[#D4A72C]">{pendingOrderId}</span>.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSimulateSuccess}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-full text-xs uppercase tracking-widest transition-all"
              >
                Simulate Payment Captured
              </button>
              <button
                onClick={handleSimulateFailure}
                className="w-full bg-rose-800 hover:bg-rose-705 text-white font-semibold py-2.5 rounded-full text-xs uppercase tracking-widest transition-all"
              >
                Simulate Payment Failed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
