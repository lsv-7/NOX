import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/auth";

// GET /api/admin/customers - Search and list customers
export async function GET(request: Request) {
  try {
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || searchParams.get("search") || "").trim();

    // Fetch customers
    let customers;
    if (query) {
      customers = await db.customer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      customers = await db.customer.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    // Return safe customer fields ONLY. NEVER expose passwordHash or internal secrets.
    const safeCustomers = customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      passwordChangedAt: c.passwordChangedAt,
      mustChangePassword: Boolean(c.mustChangePassword),
    }));

    return NextResponse.json({
      customers: safeCustomers,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Admin customer list error:", errMsg);
    return NextResponse.json(
      { error: "Failed to retrieve customers" },
      { status: 500 }
    );
  }
}
