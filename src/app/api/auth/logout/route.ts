import { NextResponse } from "next/server";
import { destroyCustomerSession } from "@/lib/customer-auth";

export async function POST() {
  try {
    await destroyCustomerSession();
    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Customer logout error:", errMsg);
    return NextResponse.json(
      { error: "Internal server error during logout" },
      { status: 500 }
    );
  }
}
