"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Please provide a valid reset token");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to reset password. The link or token may have expired.");
      }
    } catch (err) {
      console.error("Reset password failure:", err);
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0E11] items-center justify-center p-6 text-[#E6E6E6]">
      <div className="max-w-md w-full bg-[#14161C] border border-[#D4A72C]/20 rounded-2xl p-8 md:p-10 shadow-2xl text-center">
        
        {/* Brand Header */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-[#1B1E26] rounded-full flex items-center justify-center border border-[#D4A72C]/30 shadow-inner">
            <Lock className="w-6 h-6 text-[#D4A72C]" />
          </div>
        </div>

        <h1 className="font-serif text-3xl tracking-[0.25em] font-light text-white mb-2">
          NOX
        </h1>
        <p className="text-[#D4A72C] font-sans text-xs tracking-widest uppercase mb-8">
          Password Reset
        </p>

        {success ? (
          <div className="space-y-6 text-center">
            <div className="p-5 bg-[#1B2A1E] border border-[#22C55E]/30 rounded-xl text-[#86EFAC] flex flex-col items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-[#22C55E]" />
              <p className="text-sm font-medium leading-relaxed">
                Your password has been successfully updated. You can now sign in to your NOX account with your new credentials.
              </p>
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full bg-[#D4A72C] hover:bg-[#C29624] text-black font-semibold py-3.5 px-6 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              Return to NOX <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            {!tokenParam && (
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-2">
                  Reset Token
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste your reset token"
                  required
                  className="w-full text-xs bg-[#0D0E11] border border-neutral-700 focus:border-[#D4A72C] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-2">
                New Password (minimum 8 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter new password"
                required
                minLength={8}
                className="w-full text-xs bg-[#0D0E11] border border-neutral-700 focus:border-[#D4A72C] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Confirm new password"
                required
                minLength={8}
                className="w-full text-xs bg-[#0D0E11] border border-neutral-700 focus:border-[#D4A72C] rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-4 bg-[#2A1616] border border-[#EF4444]/40 text-[#FCA5A5] rounded-xl text-xs flex gap-2.5 items-start leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#EF4444]" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-[#D4A72C] hover:bg-[#C29624] disabled:opacity-50 text-black font-semibold py-3.5 px-6 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Reset Password
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/"
                className="text-[11px] text-neutral-400 hover:text-[#D4A72C] transition-colors uppercase tracking-wider"
              >
                Back to NOX Store
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-[#0D0E11] items-center justify-center text-[#D4A72C]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
