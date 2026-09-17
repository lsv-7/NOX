import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const isMockMode = process.env.NODE_ENV !== "production" && process.env.NOX_MOCK_MODE === "true";
const MOCK_DB_PATH = path.join(process.cwd(), "nox_mock_database.json");

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  passwordChangedAt: Date;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderId: string;
  customerId?: string | null;
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
  items?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MockDatabase {
  orders: Order[];
  counter: number;
  customers?: Customer[];
}

// Helper to read mock db file
function readMockDb(): MockDatabase {
  try {
    if (!fs.existsSync(MOCK_DB_PATH)) {
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify({ orders: [], counter: 0, customers: [] }, null, 2));
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
      customers: (data.customers || []).map((c: Customer) => ({
        ...c,
        passwordChangedAt: c.passwordChangedAt ? new Date(c.passwordChangedAt) : new Date(c.createdAt),
        mustChangePassword: Boolean(c.mustChangePassword),
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      })),
    };
  } catch (error) {
    console.error("Failed to read mock database file:", error);
    return { orders: [], counter: 0, customers: [] };
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
        customerId?: string | null;
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
        items?: string | null;
      };
    }): Promise<Order> {
      if (isMockMode) {
        const mockDb = readMockDb();
        const newOrder: Order = {
          id: Math.random().toString(36).substring(2, 11),
          orderId: args.data.orderId,
          customerId: args.data.customerId || null,
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
          items: args.data.items || null,
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
            customerId: args.data.customerId || null,
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
            items: args.data.items || null,
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
      where?: { customerId?: string | null; [key: string]: unknown };
      take?: number;
      skip?: number;
      orderBy?: { createdAt: "asc" | "desc" };
    }): Promise<Order[]> {
      if (isMockMode) {
        const mockDb = readMockDb();
        let orders = [...mockDb.orders];
        if (args?.where?.customerId !== undefined) {
          orders = orders.filter((o) => o.customerId === args.where?.customerId);
        }
        orders.sort((a: Order, b: Order) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        if (args?.take) orders = orders.slice(0, args.take);
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
        customerId?: string | null;
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

  customer: {
    async findUnique(args: { where: { id?: string; email?: string; phone?: string } }): Promise<Customer | null> {
      if (isMockMode) {
        const mockDb = readMockDb();
        const customer = (mockDb.customers || []).find((c) => {
          if (args.where.id && c.id === args.where.id) return true;
          if (args.where.email && c.email.toLowerCase() === args.where.email.toLowerCase()) return true;
          if (args.where.phone && c.phone === args.where.phone) return true;
          return false;
        });
        return customer || null;
      } else {
        const customer = await prismaClient!.customer.findUnique({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: args.where as any,
        });
        return customer as unknown as Customer | null;
      }
    },

    async findFirst(args: {
      where: {
        OR?: Array<{ email?: string; phone?: string }>;
        email?: string;
        phone?: string;
        id?: string;
      };
    }): Promise<Customer | null> {
      if (isMockMode) {
        const mockDb = readMockDb();
        const customer = (mockDb.customers || []).find((c) => {
          if (args.where.OR && Array.isArray(args.where.OR)) {
            return args.where.OR.some((cond: { email?: string; phone?: string }) => {
              if (cond.email && c.email.toLowerCase() === cond.email.toLowerCase()) return true;
              if (cond.phone && c.phone === cond.phone) return true;
              return false;
            });
          }
          if (args.where.email && c.email.toLowerCase() === args.where.email.toLowerCase()) return true;
          if (args.where.phone && c.phone === args.where.phone) return true;
          if (args.where.id && c.id === args.where.id) return true;
          return false;
        });
        return customer || null;
      } else {
        const customer = await prismaClient!.customer.findFirst({
          where: args.where,
        });
        return customer as unknown as Customer | null;
      }
    },

    async create(args: {
      data: {
        name: string;
        phone: string;
        email: string;
        passwordHash: string;
        passwordChangedAt?: Date;
        mustChangePassword?: boolean;
      };
    }): Promise<Customer> {
      if (isMockMode) {
        const mockDb = readMockDb();
        if (!mockDb.customers) mockDb.customers = [];
        const newCustomer: Customer = {
          id: Math.random().toString(36).substring(2, 11),
          name: args.data.name,
          phone: args.data.phone,
          email: args.data.email,
          passwordHash: args.data.passwordHash,
          passwordChangedAt: args.data.passwordChangedAt || new Date(),
          mustChangePassword: args.data.mustChangePassword ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockDb.customers.push(newCustomer);
        writeMockDb(mockDb);
        return newCustomer;
      } else {
        const customer = await prismaClient!.customer.create({
          data: args.data,
        });
        return customer as unknown as Customer;
      }
    },

    async update(args: {
      where: { id?: string; email?: string };
      data: {
        passwordHash?: string;
        passwordChangedAt?: Date;
        mustChangePassword?: boolean;
        name?: string;
        phone?: string;
      };
    }): Promise<Customer> {
      if (isMockMode) {
        const mockDb = readMockDb();
        if (!mockDb.customers) mockDb.customers = [];
        const idx = mockDb.customers.findIndex((c) => {
          if (args.where.id && c.id === args.where.id) return true;
          if (args.where.email && c.email.toLowerCase() === args.where.email.toLowerCase()) return true;
          return false;
        });
        if (idx === -1) throw new Error("Customer not found for update");
        const updated: Customer = {
          ...mockDb.customers[idx],
          ...args.data,
          updatedAt: new Date(),
        };
        mockDb.customers[idx] = updated;
        writeMockDb(mockDb);
        return updated;
      } else {
        const customer = await prismaClient!.customer.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          where: args.where as any,
          data: args.data,
        });
        return customer as unknown as Customer;
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async findMany(args?: any): Promise<Customer[]> {
      if (isMockMode) {
        const mockDb = readMockDb();
        return (mockDb.customers || []).map((c) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          passwordChangedAt: new Date(c.passwordChangedAt),
        }));
      } else {
        const customers = await prismaClient!.customer.findMany(args);
        return customers as unknown as Customer[];
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
        const updated = await prismaClient!.orderCounter.upsert({
          where: { id: 1 },
          update: { counter: { increment: 1 } },
          create: { id: 1, counter: 1 },
        });
        return updated.counter;
      }
    },
  },
};
