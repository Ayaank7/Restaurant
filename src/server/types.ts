export type TableStatus = "available" | "occupied" | "calling" | "billing";
export type OrderStatus = "pending" | "preparing" | "ready" | "served";
export type SessionMode = "qr" | "waiter";
export type SessionStatus = "active" | "closed";
export type Role = "ADMIN" | "WAITER" | "KITCHEN" | "CUSTOMER";

export interface Table {
  id: string;
  label: string;
  capacity: number;
  status: TableStatus;
  currentSessionId: string | null;
  zone: string;
}

export interface Session {
  id: string;
  tableId: string;
  mode: SessionMode;
  status: SessionStatus;
  openedAt: number;
  guests: number;
  callWaiter: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  tag?: string;
}

export interface OrderLineItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  sessionId: string;
  tableId: string;
  items: OrderLineItem[];
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryItem {
  ingredient: string;
  stock: number;
  unit: string;
}

export interface Recipe {
  menuItemId: string;
  ingredient: string;
  quantityRequired: number;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  password: string; // demo only — plaintext in-memory
  role: Exclude<Role, "CUSTOMER">;
}

// Tokens. For staff: role-bearing. For customers: session-scoped.
export interface StaffToken {
  kind: "staff";
  userId: string;
  role: Exclude<Role, "CUSTOMER">;
  iat: number;
}
export interface CustomerToken {
  kind: "customer";
  sessionId: string;
  tableId: string;
  iat: number;
}
export type AuthToken = StaffToken | CustomerToken;

export type RosEvent =
  | { type: "ORDER_CREATED"; order: Order }
  | { type: "ORDER_UPDATED"; order: Order }
  | { type: "TABLE_UPDATED"; table: Table }
  | { type: "SESSION_CREATED"; session: Session }
  | { type: "SESSION_UPDATED"; session: Session }
  | { type: "INVENTORY_UPDATED"; inventory: InventoryItem[] }
  | { type: "MENU_UPDATED"; items: MenuItem[] }
  | { type: "STAFF_UPDATED" };
