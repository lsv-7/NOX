import React from "react";
import Link from "next/link";
import { XCircle, ShieldAlert, Mail, RotateCcw } from "lucide-react";

export default function PaymentFailurePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0E11] text-[#F5F0E6]">
      {/* Header */}
      <header className="border-b border-[rgba(212,167,44,0.22)] bg-[#0D0E11] py-5">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl tracking-[0.2em] font-light text-[#D4A72C]">
            NOX
          </Link>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#CFC5B4] font-semibold">Payment Failed</span>
        </div>
      </header>

      {/* Main Failure Layout */}
      <main className="flex-grow max-w-xl mx-auto px-6 w-full py-12 md:py-20 flex flex-col justify-center animate-fadeIn">
        <div className="bg-[#08090B] border border-[rgba(212,167,44,0.22)] rounded-2xl p-8 md:p-12 shadow-2xl text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#0D0E11] rounded-full flex items-center justify-center border border-[#D4A72C]">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <h2 className="font-serif text-3xl font-light text-[#F5F0E6] tracking-wide">
            Payment Unsuccessful
          </h2>
          
          <p className="text-[#CFC5B4] font-light text-xs mt-3.5 leading-relaxed">
            Your payment could not be completed. This can happen due to incorrect details, insufficient balance, network dropouts, or cancellation of the checkout process.
          </p>

          <div className="my-8 p-4 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-200 text-left space-y-1">
            <p className="font-semibold flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Security Notice:</p>
            <p className="font-light text-red-300">No amount has been charged. You can safely try your order checkout again.</p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/"
              className="w-full bg-[#D4A72C] text-[#0D0E11] hover:bg-[#B88A20] transition-all duration-300 font-semibold py-4 px-6 rounded-full text-center text-xs uppercase tracking-[0.25em] shadow-sm flex items-center justify-center gap-2 border border-[#B88A20]"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry Payment
            </Link>
            
            <Link
              href="/"
              className="w-full border border-[#B88A20] text-[#D4A72C] hover:bg-[#D4A72C]/10 transition-all font-semibold py-3.5 px-6 rounded-full text-center text-xs uppercase tracking-[0.25em]"
            >
              Back to Home
            </Link>
          </div>
        </div>

        {/* Support details */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-neutral-500 font-light uppercase tracking-wider">
          <span className="flex items-center gap-1 font-mono text-[9px]">
            <Mail className="w-3.5 h-3.5 text-[#D4A72C]" /> noxelitecosmetics@gmail.com
          </span>
        </div>
      </main>
    </div>
  );
}
