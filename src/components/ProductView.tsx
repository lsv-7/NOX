"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Plus, Minus, ShieldCheck, Truck, AlertCircle, Loader2, Check, ShoppingBag, User, LogOut, ArrowRight, CheckCircle2 } from "lucide-react";
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

  // Active quantity stepper for the currently viewed variant in hero
  const [activeQuantity, setActiveQuantity] = useState<number>(1);

  // Multi-variant Cart State
  const [cart, setCart] = useState<{ "15g": number; "50g": number }>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("nox_checkout_pending");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.cart && (parsed.cart["15g"] > 0 || parsed.cart["50g"] > 0)) {
            return parsed.cart;
          }
          if (parsed.size === "Small") return { "15g": parsed.quantity || 1, "50g": 0 };
          if (parsed.size === "Large") return { "15g": 0, "50g": parsed.quantity || 1 };
        }
      } catch {}
    }
    return { "15g": 0, "50g": 1 };
  });

  const [addedNotification, setAddedNotification] = useState<string | null>(null);

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

  // Customer Profile & Authentication State
  interface CustomerProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
  }

  interface CustomerOrderItem {
    name: string;
    size: "15g" | "50g";
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }

  interface CustomerOrder {
    id: string;
    orderId: string;
    customerName: string;
    phone: string;
    quantity: number;
    amount: number;
    paymentStatus: string;
    deliveryStatus: string;
    orderStatus: string;
    items?: CustomerOrderItem[];
    createdAt: string;
  }

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Auth Form State (for both Tracking section and Checkout login)
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authLoginId, setAuthLoginId] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [forgotInput, setForgotInput] = useState("");

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const loadCustomerOrders = async () => {
    try {
      setOrdersLoading(true);
      setOrdersError(null);
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        const list = data.orders || [];
        setCustomerOrders(list);
        if (list.length > 0) {
          setSelectedOrderId((prev: string | null) => prev || list[0].orderId);
        }
      } else if (res.status === 401) {
        setCustomerOrders([]);
      } else {
        const data = await res.json();
        setOrdersError(data.error || "Failed to load orders");
      }
    } catch (err) {
      console.error("Orders fetch error:", err);
      setOrdersError("Failed to connect to order service");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.customer) {
            setCustomer(data.customer);
            setCustomerName((prev: string) => prev || data.customer.name);
            setPhone((prev: string) => prev || data.customer.phone);
            const ordersRes = await fetch("/api/orders");
            if (ordersRes.ok && mounted) {
              const ordersData = await ordersRes.json();
              const list = ordersData.orders || [];
              setCustomerOrders(list);
              if (list.length > 0) {
                setSelectedOrderId(list[0].orderId);
              }
            }
          }
        }
      } catch (e) {
        console.error("Mount auth check error:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!authLoginId.trim() || !authPassword) {
      setAuthError("Please enter your email or phone number and password");
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: authLoginId.trim(),
          password: authPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomer(data.customer);
        setCustomerName(data.customer.name);
        setPhone(data.customer.phone);
        setAuthPassword("");
        setAuthSuccess("Successfully signed in!");
        await loadCustomerOrders();
      } else {
        setAuthError(data.error || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setAuthError("Failed to connect to authentication server");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!regName.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword) {
      setAuthError("Please complete all registration fields");
      return;
    }
    if (regPassword.length < 8) {
      setAuthError("Password must be at least 8 characters long");
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim(),
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomer(data.customer);
        setCustomerName(data.customer.name);
        setPhone(data.customer.phone);
        setRegPassword("");
        setAuthSuccess("Account registered successfully!");
        await loadCustomerOrders();
      } else {
        setAuthError(data.error || "Registration failed. Mobile or email may already exist.");
      }
    } catch (err) {
      console.error("Register error:", err);
      setAuthError("Failed to connect to registration server");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCustomerForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!forgotInput.trim()) {
      setAuthError("Please enter your registered email or phone number");
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: forgotInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthSuccess(
          "If an account exists with these details, password reset instructions have been generated."
        );
      } else {
        setAuthError(data.error || "Failed to process request");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setAuthError("Failed to connect to server");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCustomerLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    setCustomer(null);
    setCustomerOrders([]);
    setSelectedOrderId(null);
    setAuthSuccess(null);
    setAuthError(null);
  };

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

  // Subtotal and Total calculations
  const subtotal15g = cart["15g"] * 699;
  const subtotal50g = cart["50g"] * 1299;
  const subtotal = subtotal15g + subtotal50g;
  const totalJars = cart["15g"] + cart["50g"];
  const total = subtotal + shippingChargeInr;

  // Cart manipulation handlers
  const handleAddToCart = () => {
    const key = selectedSize === "Small" ? "15g" : "50g";
    setCart((prev) => ({
      ...prev,
      [key]: activeQuantity,
    }));
    setAddedNotification(`Added ${key} (${activeQuantity} Jar${activeQuantity > 1 ? "s" : ""}) to Cart ✓`);
    setTimeout(() => setAddedNotification(null), 3000);
  };

  const handleBuyNow = () => {
    const key = selectedSize === "Small" ? "15g" : "50g";
    if (cart[key] === 0) {
      setCart((prev) => ({
        ...prev,
        [key]: activeQuantity,
      }));
    }
    checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateCartQuantity = (size: "15g" | "50g", delta: number) => {
    setCart((prev) => {
      const otherSize = size === "15g" ? "50g" : "15g";
      const newQty = prev[size] + delta;
      if (newQty <= 0 && prev[otherSize] <= 0) {
        return prev;
      }
      return {
        ...prev,
        [size]: Math.max(0, newQty),
      };
    });
  };

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

    if (!customer) {
      alert("Please sign in or create an account to proceed with checkout.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    const orderItems: Array<{ size: "15g" | "50g"; quantity: number }> = [];
    if (cart["15g"] > 0) orderItems.push({ size: "15g", quantity: cart["15g"] });
    if (cart["50g"] > 0) orderItems.push({ size: "50g", quantity: cart["50g"] });

    if (orderItems.length === 0) {
      alert("Please add at least one product variant to your cart.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Call server API to create Order with cart items
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          address,
          pincode,
          items: orderItems,
          quantity: totalJars,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize order");
      }

      // Save user details to sessionStorage for payment failure retry state preservation
      const checkoutState = { customerName, phone, address, pincode, cart };
      sessionStorage.setItem("nox_checkout_pending", JSON.stringify(checkoutState));

      if (isMockMode) {
        // Mock Mode payment simulation
        setPendingRazorpayOrderId(data.razorpayOrderId);
        setPendingOrderId(data.orderId);
        setShowMockModal(true);
        setIsSubmitting(false);
      } else {
        // Live Razorpay payment overlay
        const itemDesc = orderItems.map((i) => `${i.size} × ${i.quantity}`).join(", ");
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: "INR",
          name: "NOX",
          description: `NOX Night Cream (${itemDesc})`,
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
                NIGHT CREAM
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
                  className={`flex flex-col items-center justify-center p-5 rounded-xl border text-center transition-all ${
                    selectedSize === "Small"
                      ? "bg-[#0D0E11] border-[#D4A72C] text-[#F5F0E6] shadow-md shadow-[#D4A72C]/5"
                      : "bg-[#08090B] border-[rgba(212,167,44,0.22)] text-[#CFC5B4] hover:border-[#9D8751]"
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider font-semibold font-sans">SMALL (15G) — ₹699</span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`text-[9px] uppercase tracking-wider font-bold font-sans ${selectedSize === "Small" ? "text-[#D4A72C]" : "text-transparent"}`}>
                      SELECTED
                    </span>
                    {cart["15g"] > 0 && (
                      <span className="text-[9px] uppercase tracking-wider text-[#F5F0E6] bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-1.5 py-0.5 rounded font-mono">
                        {cart["15g"]} in cart
                      </span>
                    )}
                  </div>
                </button>

                {/* Large Variant */}
                <button
                  type="button"
                  onClick={() => setSelectedSize("Large")}
                  className={`flex flex-col items-center justify-center p-5 rounded-xl border text-center transition-all ${
                    selectedSize === "Large"
                      ? "bg-[#0D0E11] border-[#D4A72C] text-[#F5F0E6] shadow-md shadow-[#D4A72C]/5"
                      : "bg-[#08090B] border-[rgba(212,167,44,0.22)] text-[#CFC5B4] hover:border-[#9D8751]"
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider font-semibold font-sans">LARGE (50G) — ₹1,299</span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`text-[9px] uppercase tracking-wider font-bold font-sans ${selectedSize === "Large" ? "text-[#D4A72C]" : "text-transparent"}`}>
                      SELECTED
                    </span>
                    {cart["50g"] > 0 && (
                      <span className="text-[9px] uppercase tracking-wider text-[#F5F0E6] bg-[#D4A72C]/20 border border-[#D4A72C]/40 px-1.5 py-0.5 rounded font-mono">
                        {cart["50g"]} in cart
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6">
              {/* Quantity Selector for Active Variant */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#CFC5B4] font-semibold">
                  Quantity ({selectedSize === "Small" ? "15g" : "50g"})
                </span>
                <div className="flex items-center border border-[rgba(212,167,44,0.22)] rounded-full bg-[#08090B] px-2.5 py-1">
                  <button
                    type="button"
                    onClick={() => setActiveQuantity(Math.max(1, activeQuantity - 1))}
                    className="p-1 text-[#D4A72C] hover:text-[#F5F0E6] transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-xs font-semibold w-8 text-center text-[#F5F0E6]">{activeQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setActiveQuantity(activeQuantity + 1)}
                    className="p-1 text-[#D4A72C] hover:text-[#F5F0E6] transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Order pricing details row */}
              <div className="flex justify-between items-baseline mb-4 text-[#CFC5B4] text-xs font-light">
                <span>Price ({selectedSize === "Small" ? "15g" : "50g"} × {activeQuantity}):</span>
                <span className="text-[#D4A72C] font-serif text-2xl font-semibold">
                  ₹{(selectedSize === "Small" ? 699 : 1299) * activeQuantity}
                </span>
              </div>

              {/* Added Notification Toast */}
              {addedNotification && (
                <div className="mb-4 p-3 rounded-lg bg-[#D4A72C]/10 border border-[#D4A72C]/40 text-[#D4A72C] text-xs text-center font-medium animate-fade-in flex items-center justify-center gap-2">
                  <Check className="w-4 h-4 text-[#D4A72C]" />
                  <span>{addedNotification}</span>
                </div>
              )}

              {/* Action Buttons: Add to Cart + Buy Now */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full bg-[#0D0E11] hover:bg-[#15171C] text-[#D4A72C] border border-[#D4A72C] transition-all duration-300 font-semibold py-4 px-6 rounded-full text-center text-xs uppercase tracking-[0.2em] shadow-md flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>ADD TO CART</span>
                </button>
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full bg-[#D4A72C] hover:bg-[#B88A20] text-[#0D0E11] transition-all duration-300 font-semibold py-4 px-6 rounded-full text-center text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#D4A72C]/10 border border-[#B88A20]"
                >
                  BUY NOW
                </button>
              </div>

              {/* Cart Summary Banner if items exist in cart */}
              {totalJars > 0 && (
                <div className="mt-4 p-3.5 rounded-xl bg-[#08090B] border border-[rgba(212,167,44,0.22)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#CFC5B4]">
                    <ShoppingBag className="w-4 h-4 text-[#D4A72C]" />
                    <span>
                      Cart ({totalJars} {totalJars === 1 ? "jar" : "jars"}):{" "}
                      {[
                        cart["15g"] > 0 ? `15g × ${cart["15g"]}` : null,
                        cart["50g"] > 0 ? `50g × ${cart["50g"]}` : null,
                      ]
                        .filter(Boolean)
                        .join(" + ")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={scrollToCheckout}
                    className="text-[#D4A72C] hover:text-[#F5F0E6] font-semibold uppercase tracking-wider text-[10px] underline underline-offset-4"
                  >
                    View Cart (₹{subtotal}) →
                  </button>
                </div>
              )}

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

      {/* Tabs Section: Product Information Details (DARK - Deep Black Background) */}
      <div className="bg-[#08090B] text-[#F5F0E6] border-b border-[rgba(212,167,44,0.22)]">
        <div className="max-w-6xl mx-auto px-6">
          <section className="py-16">
            <div className="flex border-b border-[rgba(212,167,44,0.22)] justify-start space-x-8 text-xs mb-8 font-light uppercase tracking-[0.2em] text-[#9D8751]">
              <button
                type="button"
                onClick={() => setActiveTab("benefits")}
                className={`pb-2.5 transition-all font-semibold ${
                  activeTab === "benefits"
                    ? "border-b-2 border-[#D4A72C] text-[#D4A72C]"
                    : "hover:text-[#F5F0E6]"
                }`}
              >
                Benefits
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("howToUse")}
                className={`pb-2.5 transition-all font-semibold ${
                  activeTab === "howToUse"
                    ? "border-b-2 border-[#D4A72C] text-[#D4A72C]"
                    : "hover:text-[#F5F0E6]"
                }`}
              >
                How to Use
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ingredients")}
                className={`pb-2.5 transition-all font-semibold ${
                  activeTab === "ingredients"
                    ? "border-b-2 border-[#D4A72C] text-[#D4A72C]"
                    : "hover:text-[#F5F0E6]"
                }`}
              >
                Ingredients
              </button>
            </div>

            <div className="text-[#CFC5B4] font-light text-sm leading-relaxed max-w-2xl">
              {activeTab === "benefits" && (
                <div className="space-y-3 animate-fadeIn">
                  <ul className="list-disc list-inside space-y-2.5 text-[#CFC5B4] leading-relaxed">
                    <li>Designed for an overnight skincare routine.</li>
                    <li>Helps support a more even-looking skin appearance.</li>
                    <li>Formulated for skin that experiences blemishes and uneven-looking tone.</li>
                    <li>Provides a simple overnight care step for the skin.</li>
                    <li>Suitable for all skin types, as stated on the product label.</li>
                  </ul>
                </div>
              )}
              
              {activeTab === "howToUse" && (
                <div className="space-y-6 text-xs">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#D4A72C] mb-3">How To Use</h4>
                    <ol className="list-decimal list-inside space-y-2 text-[#CFC5B4] leading-relaxed">
                      <li>Wash your face with a herbal face wash and pat dry.</li>
                      <li>Apply a very small amount of NOX Night Cream evenly over your face.</li>
                      <li>Leave it on overnight.</li>
                      <li>In the morning, wash your face with cold water.</li>
                    </ol>
                  </div>
                  <div className="pt-4 border-t border-[rgba(212,167,44,0.22)]">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#D4A72C] mb-3">Usage & Care</h4>
                    <ul className="list-disc list-inside space-y-2 text-[#CFC5B4] leading-relaxed">
                      <li>For external use only.</li>
                      <li>Keep out of reach of children.</li>
                      <li>In case of irritation, wash immediately.</li>
                      <li>Store in a cool, dry place.</li>
                      <li>Suitable for all skin types.</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {activeTab === "ingredients" && (
                <div className="bg-[#0D0E11] p-6 rounded-xl border border-[rgba(212,167,44,0.22)] text-xs">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-[#08090B] text-[#F5F0E6] border border-[rgba(212,167,44,0.22)] px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold">Tretinoin</span>
                    <span className="bg-[#08090B] text-[#F5F0E6] border border-[rgba(212,167,44,0.22)] px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold">Hydroquinone</span>
                    <span className="bg-[#08090B] text-[#F5F0E6] border border-[rgba(212,167,44,0.22)] px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold">Niacinamide (Vitamin B3)</span>
                    <span className="bg-[#08090B] text-[#F5F0E6] border border-[rgba(212,167,44,0.22)] px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold">Licorice Root Extract</span>
                    <span className="bg-[#08090B] text-[#F5F0E6] border border-[rgba(212,167,44,0.22)] px-3 py-1 rounded-full text-[9px] uppercase tracking-wider font-semibold">Saffron</span>
                  </div>
                  <p className="text-[#CFC5B4] font-mono leading-relaxed select-all">
                    Tretinoin, Hydroquinone, Niacinamide (Vitamin B3), Licorice Root Extract, Saffron.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Checkout Form Section (DARK - Charcoal Background) */}
      <section
        id="checkout"
        ref={checkoutRef}
        className="py-16 md:py-24 bg-[#0D0E11] text-[#F5F0E6] scroll-mt-20 w-full border-t border-[rgba(212,167,44,0.22)]"
      >
        <div className="max-w-xl mx-auto px-6">
          <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-2xl p-6 md:p-10 shadow-2xl">
            <div className="text-center mb-8">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#D4A72C] font-semibold">Fulfillment Checkout</span>
              <h2 className="font-serif text-3xl font-light text-[#F5F0E6] mt-1 tracking-wide">Fulfillment Order</h2>
              <p className="text-xs text-[#CFC5B4] mt-2">Complete details to request direct shipment.</p>
            </div>

            {/* Premium High-Contrast Order Summary Card */}
            <div className="bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] p-5 rounded-xl mb-8 space-y-4 text-xs text-[#CFC5B4]">
              <div className="flex items-center justify-between border-b border-[rgba(212,167,44,0.22)] pb-2 mb-2.5">
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#F5F0E6]">
                  ORDER SUMMARY
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-[#D4A72C] font-semibold">
                  {totalJars} {totalJars === 1 ? "Jar" : "Jars"}
                </span>
              </div>
              
              {/* Line Items */}
              <div className="space-y-3 font-normal text-[#CFC5B4]">
                {/* 15g Variant Row */}
                {cart["15g"] > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-[rgba(212,167,44,0.1)]">
                    <div>
                      <p className="font-semibold text-[#F5F0E6] text-xs">NOX Night Cream — 15g</p>
                      <p className="text-[11px] text-[#9D8751]">₹699 per jar</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-[rgba(212,167,44,0.22)] rounded-full bg-[#08090B] px-2 py-0.5">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity("15g", -1)}
                          className="p-1 text-[#D4A72C] hover:text-[#F5F0E6] transition-colors"
                          aria-label="Decrease 15g quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-[#F5F0E6] min-w-[20px] text-center">
                          {cart["15g"]}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity("15g", 1)}
                          className="p-1 text-[#D4A72C] hover:text-[#F5F0E6] transition-colors"
                          aria-label="Increase 15g quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-semibold text-[#F5F0E6] min-w-[65px] text-right">
                        ₹{cart["15g"] * 699}
                      </span>
                    </div>
                  </div>
                )}

                {/* 50g Variant Row */}
                {cart["50g"] > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-[rgba(212,167,44,0.1)]">
                    <div>
                      <p className="font-semibold text-[#F5F0E6] text-xs">NOX Night Cream — 50g</p>
                      <p className="text-[11px] text-[#9D8751]">₹1,299 per jar</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-[rgba(212,167,44,0.22)] rounded-full bg-[#08090B] px-2 py-0.5">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity("50g", -1)}
                          className="p-1 text-[#D4A72C] hover:text-[#F5F0E6] transition-colors"
                          aria-label="Decrease 50g quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold text-[#F5F0E6] min-w-[20px] text-center">
                          {cart["50g"]}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity("50g", 1)}
                          className="p-1 text-[#D4A72C] hover:text-[#F5F0E6] transition-colors"
                          aria-label="Increase 50g quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-semibold text-[#F5F0E6] min-w-[65px] text-right">
                        ₹{cart["50g"] * 1299}
                      </span>
                    </div>
                  </div>
                )}

                {/* Empty Cart Notice */}
                {totalJars === 0 && (
                  <div className="py-4 text-center text-[#9D8751] text-xs">
                    Your cart is empty. Please select a variant above.
                  </div>
                )}

                {/* Quick-add buttons for missing variant */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {cart["15g"] === 0 && (
                    <button
                      type="button"
                      onClick={() => updateCartQuantity("15g", 1)}
                      className="text-[10px] uppercase tracking-wider text-[#D4A72C] bg-[#08090B] hover:bg-[#15171C] border border-[rgba(212,167,44,0.3)] hover:border-[#D4A72C] px-3 py-1.5 rounded-full transition-all flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3 h-3" /> Add 15g (₹699)
                    </button>
                  )}
                  {cart["50g"] === 0 && (
                    <button
                      type="button"
                      onClick={() => updateCartQuantity("50g", 1)}
                      className="text-[10px] uppercase tracking-wider text-[#D4A72C] bg-[#08090B] hover:bg-[#15171C] border border-[rgba(212,167,44,0.3)] hover:border-[#D4A72C] px-3 py-1.5 rounded-full transition-all flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3 h-3" /> Add 50g (₹1,299)
                    </button>
                  )}
                </div>

                {/* Subtotal */}
                <div className="flex justify-between border-t border-[rgba(212,167,44,0.22)] pt-2.5 mt-2">
                  <span>Subtotal:</span>
                  <span className="text-[#F5F0E6] font-semibold">₹{subtotal}</span>
                </div>
              </div>
              
              <div className="flex justify-between text-[#CFC5B4] pb-2 border-b border-[rgba(212,167,44,0.22)]">
                <span>Shipping</span>
                <span className="text-[#D4A72C] font-bold uppercase tracking-wider">
                  {shippingChargeInr === 0 ? "FREE" : `₹${shippingChargeInr}`}
                </span>
              </div>
              
              <div className="flex justify-between items-baseline pt-2.5 text-[#F5F0E6]">
                <span className="font-bold uppercase tracking-wider text-[10px]">TOTAL AMOUNT</span>
                <span className="font-serif text-xl font-bold text-[#D4A72C]">₹{total}</span>
              </div>
            </div>

            {/* Customer Account Authentication Requirement Box */}
            {customer ? (
              <div className="bg-[#08090B] border border-[rgba(212,167,44,0.3)] rounded-xl p-4 flex justify-between items-center text-xs mb-6 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0D0E11] border border-[#D4A72C] flex items-center justify-center text-[#D4A72C]">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#9D8751] block text-[9px] uppercase tracking-wider">Signed In Customer</span>
                    <span className="text-[#F5F0E6] font-medium">{customer.name} • {customer.phone}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCustomerLogout}
                  className="text-[10px] text-[#D4A72C] hover:underline uppercase tracking-wider font-semibold"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="bg-[#08090B] border border-[#D4A72C]/40 rounded-xl p-5 mb-6 space-y-4 text-left shadow-lg">
                <div className="flex items-center justify-between border-b border-[rgba(212,167,44,0.22)] pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#D4A72C]" />
                    <span className="text-xs uppercase tracking-wider text-[#F5F0E6] font-semibold">
                      Account Required to Purchase
                    </span>
                  </div>
                  <div className="flex gap-2 text-[10px] font-semibold uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => { setAuthMode("login"); setAuthError(null); }}
                      className={`px-3 py-1 rounded-full transition-all ${
                        authMode === "login"
                          ? "bg-[#D4A72C] text-[#0D0E11]"
                          : "text-[#CFC5B4] hover:text-[#F5F0E6] border border-[rgba(212,167,44,0.22)]"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("register"); setAuthError(null); }}
                      className={`px-3 py-1 rounded-full transition-all ${
                        authMode === "register"
                          ? "bg-[#D4A72C] text-[#0D0E11]"
                          : "text-[#CFC5B4] hover:text-[#F5F0E6] border border-[rgba(212,167,44,0.22)]"
                      }`}
                    >
                      Register
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-[#2A1616] border border-[#EF4444]/40 text-[#FCA5A5] rounded-lg text-xs flex gap-2 items-center">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#EF4444]" />
                    <span>{authError}</span>
                  </div>
                )}
                {authSuccess && (
                  <div className="p-3 bg-[#1B2A1E] border border-[#22C55E]/30 text-[#86EFAC] rounded-lg text-xs flex gap-2 items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#22C55E]" />
                    <span>{authSuccess}</span>
                  </div>
                )}

                {authMode === "login" ? (
                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        value={authLoginId}
                        onChange={(e) => setAuthLoginId(e.target.value)}
                        placeholder="Registered Email or 10-digit Mobile"
                        className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-3.5 py-2.5 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C]"
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-3.5 py-2.5 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C]"
                      />
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <a
                        href="/reset-password"
                        className="text-[10px] text-[#9D8751] hover:text-[#D4A72C] transition-colors"
                      >
                        Forgot Password?
                      </a>
                      <button
                        type="button"
                        onClick={handleCustomerLogin}
                        disabled={authSubmitting}
                        className="bg-[#D4A72C] text-[#0D0E11] font-semibold px-5 py-2 rounded-full text-xs uppercase tracking-wider hover:bg-[#B88A20] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {authSubmitting ? "Signing In..." : "Sign In & Continue"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-3.5 py-2.5 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C]"
                      />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="10-digit Mobile Number"
                        className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-3.5 py-2.5 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-3.5 py-2.5 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C]"
                      />
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Password (min 8 chars)"
                        className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-3.5 py-2.5 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C]"
                      />
                    </div>
                    <div className="text-right pt-1">
                      <button
                        type="button"
                        onClick={handleCustomerRegister}
                        disabled={authSubmitting}
                        className="bg-[#D4A72C] text-[#0D0E11] font-semibold px-5 py-2 rounded-full text-xs uppercase tracking-wider hover:bg-[#B88A20] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {authSubmitting ? "Registering..." : "Create Account & Continue"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C]/40"
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
                  placeholder="e.g. 8309053090"
                  className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C]/40"
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
                  className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] resize-none focus:outline-none focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C]/40"
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
                    className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#F5F0E6] placeholder-[#9D8751] focus:outline-none focus:border-[#D4A72C] focus:ring-1 focus:ring-[#D4A72C]/40"
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
                  <div className="w-full bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] px-4 py-3 rounded-lg text-xs text-[#D4A72C] font-semibold uppercase tracking-wider">
                    FREE DELIVERY
                  </div>
                </div>
              </div>

              {/* Proceed Button */}
              <button
                type="submit"
                disabled={isSubmitting || !customer}
                className="w-full bg-[#D4A72C] hover:bg-[#B88A20] disabled:opacity-50 disabled:cursor-not-allowed text-[#0D0E11] font-semibold py-4 px-8 rounded-full text-center text-xs uppercase tracking-[0.25em] shadow-md transition-all border border-[#B88A20] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> SECURING CHECKOUT...
                  </>
                ) : !customer ? (
                  "SIGN IN / REGISTER TO CHECKOUT"
                ) : (
                  "SECURE CHECKOUT"
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Customer Tracking Section (DARK - Charcoal Background) */}
      <section id="tracking" className="bg-[#0D0E11] max-w-6xl mx-auto px-6 py-20 border-t border-[rgba(212,167,44,0.22)] scroll-mt-20 text-[#F5F0E6]">
        {!customer ? (
          /* Logged-out State: Clean Luxury NOX-styled Login / Register / Forgot Password Portal */
          <div className="max-w-xl mx-auto bg-[#08090B] border border-[rgba(212,167,44,0.3)] rounded-3xl p-8 md:p-10 shadow-2xl text-center">
            <div className="w-12 h-12 bg-[#0D0E11] rounded-full flex items-center justify-center border border-[#D4A72C] mx-auto mb-4">
              <User className="w-5 h-5 text-[#D4A72C]" />
            </div>

            <h3 className="font-serif text-2xl font-light text-[#F5F0E6] mb-1">
              Customer Account &amp; Tracking
            </h3>
            <p className="text-xs text-[#CFC5B4] font-light mb-6">
              Sign in to view your orders, live shipping status, and dispatch progress.
            </p>

            {/* Tab Controls */}
            <div className="flex border-b border-[rgba(212,167,44,0.22)] mb-6 justify-center gap-4 text-xs uppercase tracking-widest font-semibold">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(null); setAuthSuccess(null); }}
                className={`pb-3 transition-all border-b-2 cursor-pointer ${
                  authMode === "login"
                    ? "border-[#D4A72C] text-[#D4A72C]"
                    : "border-transparent text-[#9D8751] hover:text-[#F5F0E6]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(null); setAuthSuccess(null); }}
                className={`pb-3 transition-all border-b-2 cursor-pointer ${
                  authMode === "register"
                    ? "border-[#D4A72C] text-[#D4A72C]"
                    : "border-transparent text-[#9D8751] hover:text-[#F5F0E6]"
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("forgot"); setAuthError(null); setAuthSuccess(null); }}
                className={`pb-3 transition-all border-b-2 cursor-pointer ${
                  authMode === "forgot"
                    ? "border-[#D4A72C] text-[#D4A72C]"
                    : "border-transparent text-[#9D8751] hover:text-[#F5F0E6]"
                }`}
              >
                Forgot Password
              </button>
            </div>

            {authError && (
              <div className="p-3.5 bg-[#2A1616] border border-[#EF4444]/40 text-[#FCA5A5] rounded-xl text-xs flex gap-2.5 items-start mb-6 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#EF4444]" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3.5 bg-[#1B2A1E] border border-[#22C55E]/30 text-[#86EFAC] rounded-xl text-xs flex gap-2.5 items-start mb-6 text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#22C55E]" />
                <span>{authSuccess}</span>
              </div>
            )}

            {authMode === "login" && (
              <form onSubmit={handleCustomerLogin} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                    Email or Mobile Number
                  </label>
                  <input
                    type="text"
                    value={authLoginId}
                    onChange={(e) => setAuthLoginId(e.target.value)}
                    placeholder="e.g. customer@example.com or 8309053090"
                    required
                    className="w-full text-xs bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A72C] text-[#F5F0E6] placeholder-[#9D8751] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                    Password
                  </label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full text-xs bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A72C] text-[#F5F0E6] placeholder-[#9D8751] transition-all"
                  />
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => { setAuthMode("forgot"); setAuthError(null); }}
                    className="text-[11px] text-[#9D8751] hover:text-[#D4A72C] transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="bg-[#D4A72C] hover:bg-[#B88A20] text-[#0D0E11] font-semibold py-2.5 px-6 rounded-full text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    {authSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...</> : "Sign In"}
                  </button>
                </div>
              </form>
            )}

            {authMode === "register" && (
              <form onSubmit={handleCustomerRegister} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Your legal or preferred name"
                    required
                    className="w-full text-xs bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A72C] text-[#F5F0E6] placeholder-[#9D8751] transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                      Mobile Number (India)
                    </label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      required
                      className="w-full text-xs bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A72C] text-[#F5F0E6] placeholder-[#9D8751] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      required
                      className="w-full text-xs bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A72C] text-[#F5F0E6] placeholder-[#9D8751] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                    Password (minimum 8 characters)
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    minLength={8}
                    className="w-full text-xs bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A72C] text-[#F5F0E6] placeholder-[#9D8751] transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full bg-[#D4A72C] hover:bg-[#B88A20] text-[#0D0E11] font-semibold py-3 px-6 rounded-full text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    {authSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Account...</> : "Register & Sign In"}
                  </button>
                </div>
              </form>
            )}

            {authMode === "forgot" && (
              <form onSubmit={handleCustomerForgot} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#D4A72C] mb-1.5 font-semibold">
                    Registered Email or Phone
                  </label>
                  <input
                    type="text"
                    value={forgotInput}
                    onChange={(e) => setForgotInput(e.target.value)}
                    placeholder="Enter email or 10-digit mobile"
                    required
                    className="w-full text-xs bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-xl px-4 py-3 focus:outline-none focus:border-[#D4A72C] text-[#F5F0E6] placeholder-[#9D8751] transition-all"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full bg-[#D4A72C] hover:bg-[#B88A20] text-[#0D0E11] font-semibold py-3 px-6 rounded-full text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    {authSubmitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</> : "Request Password Reset"}
                  </button>

                  <a
                    href="/reset-password"
                    className="text-center text-[11px] text-[#D4A72C] hover:underline uppercase tracking-wider"
                  >
                    Have a reset token? Enter it on the reset page →
                  </a>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Logged-in State: Authenticated Order History & Live Tracking */
          <div className="space-y-8">
            {/* Customer Header Bar */}
            <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-[#0D0E11] border border-[#D4A72C] flex items-center justify-center text-[#D4A72C] shadow-inner">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-light text-[#F5F0E6]">
                    Welcome, {customer.name}
                  </h3>
                  <p className="text-[11px] text-[#9D8751] font-light">
                    {customer.email} • {customer.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-[10px] uppercase tracking-wider text-[#CFC5B4] bg-[#0D0E11] px-3 py-1.5 rounded-full border border-[rgba(212,167,44,0.22)]">
                  {customerOrders.length} {customerOrders.length === 1 ? "Order" : "Orders"}
                </span>
                <button
                  type="button"
                  onClick={handleCustomerLogout}
                  className="border border-[rgba(212,167,44,0.3)] hover:border-[#D4A72C] text-[#D4A72C] hover:text-[#F5F0E6] px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" /> Sign Out
                </button>
              </div>
            </div>

            {/* Orders Section */}
            {ordersLoading ? (
              <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-2xl p-12 text-center text-xs text-[#CFC5B4] font-light flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4A72C]" /> Loading your orders...
              </div>
            ) : ordersError ? (
              <div className="bg-[#08090B] border border-red-500/30 rounded-2xl p-8 text-center text-xs text-rose-400">
                <p className="mb-3">{ordersError}</p>
                <button
                  onClick={loadCustomerOrders}
                  className="bg-[#D4A72C] text-[#0D0E11] px-4 py-1.5 rounded-full text-2xs uppercase tracking-wider font-semibold cursor-pointer"
                >
                  Retry Loading
                </button>
              </div>
            ) : customerOrders.length === 0 ? (
              <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-2xl p-12 text-center space-y-4">
                <p className="font-serif text-lg text-[#F5F0E6] font-light">No Orders Placed Yet</p>
                <p className="text-xs text-[#CFC5B4] font-light max-w-md mx-auto leading-relaxed">
                  You do not have any orders associated with this account. Select your desired variant above to experience NOX Night Cream.
                </p>
                <a
                  href="#product"
                  className="inline-block bg-[#D4A72C] hover:bg-[#B88A20] text-[#0D0E11] font-semibold py-2.5 px-6 rounded-full text-xs uppercase tracking-widest transition-all"
                >
                  Explore Variants
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Orders List Column */}
                <div className="lg:col-span-1 space-y-4">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#9D8751] font-semibold mb-2">
                    Select Order to Inspect
                  </h4>
                  {customerOrders.map((ord) => {
                    const isSelected = selectedOrderId === ord.orderId;
                    return (
                      <div
                        key={ord.orderId}
                        onClick={() => setSelectedOrderId(ord.orderId)}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? "bg-[#0D0E11] border-[#D4A72C] shadow-lg shadow-[#D4A72C]/10"
                            : "bg-[#08090B] border-[rgba(212,167,44,0.22)] hover:border-[#9D8751]"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm text-[#F5F0E6] font-mono">
                            {ord.orderId}
                          </span>
                          <span className="font-serif font-bold text-sm text-[#D4A72C]">
                            ₹{ord.amount / 100}
                          </span>
                        </div>

                        <div className="text-[10px] text-[#9D8751] mb-3">
                          {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>

                        <div className="flex flex-wrap gap-2 text-[9px] uppercase tracking-wider font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded-full border ${
                              ord.paymentStatus === "PAID"
                                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
                                : "bg-amber-950/60 border-amber-500/50 text-amber-400"
                            }`}
                          >
                            {ord.paymentStatus}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full border ${
                              ord.deliveryStatus === "SENT"
                                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
                                : "bg-neutral-900 border-neutral-700 text-neutral-400"
                            }`}
                          >
                            {ord.deliveryStatus === "SENT" ? "SENT" : "PROCESSING"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Order Detailed Status & Timeline Column */}
                <div className="lg:col-span-2 bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-2xl p-6 md:p-8 shadow-xl text-left">
                  {(() => {
                    const currentOrder = customerOrders.find((o) => o.orderId === selectedOrderId) || customerOrders[0];
                    if (!currentOrder) return null;

                    return (
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[rgba(212,167,44,0.22)] pb-4 gap-3">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-mono text-xl font-bold text-[#F5F0E6]">
                                {currentOrder.orderId}
                              </h4>
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                  currentOrder.deliveryStatus === "SENT"
                                    ? "bg-emerald-950 border-emerald-500 text-emerald-400"
                                    : "bg-amber-950 border-amber-500 text-amber-400"
                                }`}
                              >
                                {currentOrder.deliveryStatus === "SENT" ? "Dispatched / Sent" : "Processing"}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#9D8751] mt-1">
                              Ordered on {new Date(currentOrder.createdAt).toLocaleString("en-IN")}
                            </p>
                          </div>

                          <button
                            onClick={() => router.push(`/order-confirmation/${currentOrder.orderId}`)}
                            className="border border-[#D4A72C] text-[#D4A72C] hover:bg-[#D4A72C] hover:text-[#0D0E11] px-4 py-2 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            View Order Summary <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Order Timeline Visualizer */}
                        <div className="bg-[#0D0E11] border border-[rgba(212,167,44,0.22)] rounded-2xl p-6">
                          <h5 className="text-[10px] uppercase tracking-[0.2em] text-[#D4A72C] font-semibold mb-3">
                            Live Delivery Progress
                          </h5>
                          <OrderTimeline
                            paymentStatus={currentOrder.paymentStatus}
                            deliveryStatus={currentOrder.deliveryStatus}
                          />
                        </div>

                        {/* Order Items Breakdown */}
                        {currentOrder.items && currentOrder.items.length > 0 && (
                          <div className="border-t border-[rgba(212,167,44,0.22)] pt-5">
                            <h5 className="text-[10px] uppercase tracking-[0.2em] text-[#9D8751] font-semibold mb-3">
                              Order Items
                            </h5>
                            <div className="space-y-2">
                              {currentOrder.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center text-xs text-[#F5F0E6] bg-[#0D0E11] px-4 py-3 rounded-xl border border-[rgba(212,167,44,0.15)]"
                                >
                                  <div>
                                    <span className="font-medium">{item.name}</span>
                                    <span className="text-[#9D8751] ml-2">({item.size}) × {item.quantity}</span>
                                  </div>
                                  <span className="text-[#D4A72C] font-mono">
                                    ₹{item.subtotal || item.unitPrice * item.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
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
