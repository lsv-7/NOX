import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const isMockMode = process.env.NOX_MOCK_MODE === "true";
const MOCK_DB_PATH = path.join(process.cwd(), "nox_mock_database.json");

export interface Order {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  pincode: string;
  quantity: number;
  amount: number; // Stored in paise
  paymentStatus: "PENDING" | "PAID" | "FAILED";
  paymentId: string | null;
  razorpayOrderId: string;
  orderStatus: "NEW" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  notificationStatus: "PENDING" | "SENT" | "FAILED";
  deliveryStatus: "NOT_SENT" | "SENT";
  createdAt: Date;
  updatedAt: Date;
}

interface MockDatabase {
  orders: Order[];
  counter: number;
}

// Helper to read mock db file
function readMockDb(): MockDatabase {
  try {
    if (!fs.existsSync(MOCK_DB_PATH)) {
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify({ orders: [], counter: 0 }, null, 2));
    }
    const content = fs.readFileSync(MOCK_DB_PATH, "utf-8");
    const data = JSON.parse(content);
    return {
      orders: (data.orders || []).map((item: unknown) => {
        const o = item as Record<string, unknown>;
        return {
          ...o,
          deliveryStatus: o.deliveryStatus || "NOT_SENT",
          createdAt: new Date(o.createdAt as string),
          updatedAt: new Date(o.updatedAt as string),
        } as unknown as Order;
      }),
      counter: data.counter || 0,
    };
  } catch (error) {
    console.error("Failed to read mock database file:", error);
    return { orders: [], counter: 0 };
  }
}

// Helper to write mock db file
function writeMockDb(data: MockDatabase): void {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to write mock database file:", error);
  }
}

// Prisma Client for Real Database
let prismaClient: PrismaClient | null = null;
if (!isMockMode) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required when NOX_MOCK_MODE is not true");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prismaClient = new PrismaClient({ adapter });
}

export const db = {
  order: {
    async create(args: {
      data: {
        orderId: string;
        customerName: string;
        phone: string;
        address: string;
        pincode: string;
        quantity: number;
        amount: number;
        razorpayOrderId: string;
        paymentStatus?: "PENDING" | "PAID" | "FAILED";
        orderStatus?: "NEW" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
        notificationStatus?: "PENDING" | "SENT" | "FAILED";
        deliveryStatus?: "NOT_SENT" | "SENT";
      };
    }): Promise<Order> {
      if (isMockMode) {
        const mockDb = readMockDb();
        const newOrder: Order = {
          id: Math.random().toString(36).substring(2, 11),
          orderId: args.data.orderId,
          customerName: args.data.customerName,
          phone: args.data.phone,
          address: args.data.address,
          pincode: args.data.pincode,
          quantity: args.data.quantity,
          amount: args.data.amount,
          paymentStatus: args.data.paymentStatus || "PENDING",
          paymentId: null,
          razorpayOrderId: args.data.razorpayOrderId,
          orderStatus: args.data.orderStatus || "NEW",
          notificationStatus: args.data.notificationStatus || "PENDING",
          deliveryStatus: args.data.deliveryStatus || "NOT_SENT",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockDb.orders.push(newOrder);
        writeMockDb(mockDb);
        return newOrder;
      } else {
        const res = await prismaClient!.order.create({
          data: {
            orderId: args.data.orderId,
            customerName: args.data.customerName,
            phone: args.data.phone,
            address: args.data.address,
            pincode: args.data.pincode,
            quantity: args.data.quantity,
            amount: args.data.amount,
            razorpayOrderId: args.data.razorpayOrderId,
            paymentStatus: args.data.paymentStatus,
            orderStatus: args.data.orderStatus,
            notificationStatus: args.data.notificationStatus,
            deliveryStatus: args.data.deliveryStatus || "NOT_SENT",
          },
        });
        return res as unknown as Order;
      }
    },

    async findUnique(args: { where: { orderId?: string; id?: string; razorpayOrderId?: string } }): Promise<Order | null> {
      if (isMockMode) {
        const mockDb = readMockDb();
        const order = mockDb.orders.find((o: Order) => {
          if (args.where.orderId && o.orderId === args.where.orderId) return true;
          if (args.where.id && o.id === args.where.id) return true;
          if (args.where.razorpayOrderId && o.razorpayOrderId === args.where.razorpayOrderId) return true;
          return false;
        });
        if (!order) return null;
        return order;
      } else {
        const order = await prismaClient!.order.findUnique({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: args.where as any,
        });
        return order as unknown as Order | null;
      }
    },

    async findMany(args?: {
      take?: number;
      skip?: number;
      orderBy?: { createdAt: "asc" | "desc" };
    }): Promise<Order[]> {
      if (isMockMode) {
        const mockDb = readMockDb();
        const orders = [...mockDb.orders].sort((a: Order, b: Order) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        return orders;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orders = await prismaClient!.order.findMany(args as any);
        return orders as unknown as Order[];
      }
    },

    async update(args: {
      where: { id?: string; orderId?: string; razorpayOrderId?: string };
      data: {
        paymentStatus?: "PENDING" | "PAID" | "FAILED";
        paymentId?: string | null;
        orderStatus?: "NEW" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
        notificationStatus?: "PENDING" | "SENT" | "FAILED";
        deliveryStatus?: "NOT_SENT" | "SENT";
      };
    }): Promise<Order> {
      if (isMockMode) {
        const mockDb = readMockDb();
        const idx = mockDb.orders.findIndex((o: Order) => {
          if (args.where.id && o.id === args.where.id) return true;
          if (args.where.orderId && o.orderId === args.where.orderId) return true;
          if (args.where.razorpayOrderId && o.razorpayOrderId === args.where.razorpayOrderId) return true;
          return false;
        });
        if (idx === -1) {
          throw new Error("Order not found for update in mock database");
        }
        const updated: Order = {
          ...mockDb.orders[idx],
          ...args.data,
          updatedAt: new Date(),
        };
        mockDb.orders[idx] = updated;
        writeMockDb(mockDb);
        return updated;
      } else {
        const updated = await prismaClient!.order.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: args.where as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: args.data as any,
        });
        return updated as unknown as Order;
      }
    },
  },

  orderCounter: {
    async increment(): Promise<number> {
      if (isMockMode) {
        const mockDb = readMockDb();
        mockDb.counter += 1;
        writeMockDb(mockDb);
        return mockDb.counter;
      } else {
        const result = await prismaClient!.$transaction(async (tx) => {
          let counterRecord = await tx.orderCounter.findUnique({ where: { id: 1 } });
          if (!counterRecord) {
            counterRecord = await tx.orderCounter.create({ data: { id: 1, counter: 0 } });
          }
          const updated = await tx.orderCounter.update({
            where: { id: 1 },
            data: { counter: { increment: 1 } },
          });
          return updated.counter;
        });
        return result;
      }
    },
  },
};
