import { NextResponse } from "next/server";
import { verifyCustomerSession } from "@/lib/customer-auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await verifyCustomerSession();
    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const customer = await db.customer.findUnique({
      where: { id: session.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { authenticated: false, error: "Account not found" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error retrieving authenticated customer:", errMsg);
    return NextResponse.json(
      { authenticated: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
