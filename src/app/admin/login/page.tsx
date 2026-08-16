"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid admin credentials");
      }
    } catch (err) {
      console.error("Login failure:", err);
      setError("Failed to connect to authentication server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F7F7F5] items-center justify-center p-6 text-[#171717]">
      <div className="max-w-md w-full bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl p-8 md:p-10 shadow-sm text-center">
        
        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-[#F7F7F5] rounded-full flex items-center justify-center border border-[#E5E5E5]">
            <Lock className="w-5 h-5 text-[#666666]" />
          </div>
        </div>

        {/* Brand Logo */}
        <div className="font-serif text-3xl tracking-[0.2em] font-light text-[#171717] mb-2">
          NOX
        </div>
        <p className="text-[#666666] font-sans text-xs tracking-wider uppercase mb-8">
          Admin Portal Authentication
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div>
            <label 
              htmlFor="adminPassword" 
              className="block text-[10px] uppercase tracking-wider font-semibold text-[#666666] mb-2"
            >
              Admin Password
            </label>
            <input
              type="password"
              id="adminPassword"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Enter password"
              required
              className="w-full text-xs bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg px-3.5 py-3 focus:outline-none focus:border-[#171717] text-[#171717] placeholder-neutral-400 transition-all"
            />
          </div>

          {error && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] rounded-lg text-2xs flex gap-2 items-start leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-[#171717] hover:bg-[#333333] text-[#FFFFFF] disabled:bg-neutral-355 transition-all font-semibold py-3.5 px-6 rounded-lg text-center text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                Login <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
