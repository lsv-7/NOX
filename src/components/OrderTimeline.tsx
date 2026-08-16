import React from "react";

interface OrderTimelineProps {
  paymentStatus: string;
  deliveryStatus: string;
}

export function OrderTimeline({ paymentStatus, deliveryStatus }: OrderTimelineProps) {
  const isPaid = paymentStatus === "PAID";
  const isSent = deliveryStatus === "SENT";

  // Derive steps statuses:
  // Step 1: Order Placed -> always completed
  // Step 2: Payment Confirmed -> completed if paid
  // Step 3: Preparing for Dispatch -> completed if sent, active if paid & not sent
  // Step 4: Shipped -> active if sent, pending otherwise
  const step1Status = "completed";
  const step2Status = isPaid ? "completed" : "active";
  const step3Status = isSent ? "completed" : isPaid ? "active" : "pending";
  const step4Status = isSent ? "active" : "pending";

  const steps = [
    { label: "Order Placed", status: step1Status, description: "Your order details have been recorded" },
    { label: "Payment Confirmed", status: step2Status, description: isPaid ? "Payment successfully captured" : "Awaiting payment verification" },
    { label: "Preparing for Dispatch", status: step3Status, description: isSent ? "Packaging completed" : "We are preparing your item" },
    { label: "Shipped", status: step4Status, description: isSent ? "Handed over to courier partner" : "Awaiting package handover" },
  ];

  return (
    <div className="flex flex-col gap-4 py-4 pl-2 max-w-sm mx-auto text-left">
      {steps.map((step, idx) => {
        const isActive = step.status === "active";
        const isCompleted = step.status === "completed";
        
        return (
          <div key={step.label} className="relative flex gap-4 items-start pb-4 last:pb-0">
            {/* Line connecting nodes */}
            {idx < steps.length - 1 && (
              <div className={`absolute left-[7px] top-[18px] bottom-0 w-[1px] ${
                isCompleted ? "bg-[#D4A72C]" : "bg-[rgba(212,167,44,0.22)]"
              }`} />
            )}
            
            {/* Step indicator node */}
            <div className="z-10 w-3.5 h-3.5 flex items-center justify-center mt-1">
              {isCompleted ? (
                <div className="w-3.5 h-3.5 rounded-full bg-[#0D0E11] border border-[#D4A72C] flex items-center justify-center text-[#D4A72C] font-bold text-[8px]">
                  ✓
                </div>
              ) : isActive ? (
                <div className="w-3 h-3 rounded-full bg-[#D4A72C] border-2 border-[#0D0E11] ring-2 ring-[#D4A72C]/40 flex items-center justify-center animate-pulse" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-[#08090B] border-2 border-[rgba(212,167,44,0.22)] ring-1 ring-neutral-900" />
              )}
            </div>
            
            {/* Text description */}
            <div className="flex flex-col gap-0.5">
              <span className={`text-xs font-semibold tracking-wide ${
                isCompleted ? "text-[#F5F0E6]" : isActive ? "text-[#D4A72C]" : "text-[#9D8751]"
              }`}>
                {step.label}
              </span>
              <span className="text-[10px] text-[#CFC5B4] font-light leading-normal">
                {step.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
