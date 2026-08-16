import React from "react";
import Link from "next/link";
import { XCircle, ShieldAlert, Mail, RotateCcw } from "lucide-react";

export default function PaymentFailurePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="border-b border-[#D3D9F3]/30 bg-[#FAFAFA] py-4">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl tracking-widest font-light text-[#969FE0]">
            NOX
          </Link>
          <span className="text-2xs uppercase tracking-widest text-neutral-400 font-semibold">Payment Failed</span>
        </div>
      </header>

      {/* Main Failure Layout */}
      <main className="flex-grow max-w-xl mx-auto px-6 w-full py-12 md:py-20 flex flex-col justify-center">
        <div className="bg-[#FFFFFF] border border-[#D3D9F3] rounded-2xl p-8 md:p-12 shadow-sm text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center border border-rose-100">
              <XCircle className="w-8 h-8 text-rose-600" />
            </div>
          </div>

          <h2 className="font-serif text-3xl font-light text-[#292929] tracking-tight">
            Payment Unsuccessful
          </h2>
          
          <p className="text-neutral-500 font-light text-sm mt-3 leading-relaxed">
            Your payment could not be completed. This can happen due to incorrect details, insufficient balance, network dropouts, or cancellation of the checkout process.
          </p>

          <div className="my-8 p-4 bg-rose-50/50 border border-rose-100 rounded-xl text-xs text-rose-800 text-left space-y-1">
            <p className="font-semibold flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Security Notice:</p>
            <p className="font-light text-rose-700">No amount has been charged. You can safely try your order checkout again.</p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/"
              className="w-full bg-[#2C42A5] text-[#FFFFFF] hover:bg-[#2C42A5]/90 transition-all font-medium py-4 px-6 rounded-full text-center text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 hover:shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry Payment
            </Link>
            
            <Link
              href="/"
              className="w-full border border-[#D3D9F3] hover:bg-[#FAFAFA] text-neutral-700 font-medium py-3 px-6 rounded-full text-center text-xs uppercase tracking-widest transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Support details */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-neutral-400 font-light">
          <span className="flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-[#C9B27C]" /> support@nox.in
          </span>
        </div>
      </main>
    </div>
  );
}
