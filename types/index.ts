export type UserRole = "OWNER" | "MANAGER" | "CASHIER";
export type OrderStatus = "PENDING" | "CONFIRMED" | "READY" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "CASH" | "QRIS" | "TRANSFER" | "CARD";
export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  branchId: string | null;
  branch: { id: string; name: string; city: string | null } | null;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topItems: { name: string; count: number }[];
}
