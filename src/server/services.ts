import { publish } from "./events";
import { getStore } from "./store";
import type {
  MenuItem,
  Order,
  OrderLineItem,
  OrderStatus,
  Session,
  SessionMode,
  StaffUser,
  Table,
} from "./types";

function rid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ========= Tables =========
export function listTables(): Table[] {
  return getStore().tables;
}

export function getTable(id: string): Table | undefined {
  return getStore().tables.find((t) => t.id === id);
}

function updateTable(id: string, patch: Partial<Table>): Table | undefined {
  const store = getStore();
  const idx = store.tables.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  store.tables[idx] = { ...store.tables[idx], ...patch };
  publish({ type: "TABLE_UPDATED", table: store.tables[idx] });
  return store.tables[idx];
}

// ========= Sessions =========
export function createSession(input: {
  tableId: string;
  mode: SessionMode;
  guests?: number;
}): Session {
  const store = getStore();
  const table = getTable(input.tableId);
  if (!table) throw new Error("Table not found");

  // Reuse existing active session for the table (so multiple guests share an order)
  const existing = store.sessions.find(
    (s) => s.tableId === input.tableId && s.status === "active",
  );
  if (existing) return existing;

  const session: Session = {
    id: rid("S"),
    tableId: input.tableId,
    mode: input.mode,
    status: "active",
    openedAt: Date.now(),
    guests: input.guests ?? 2,
    callWaiter: false,
  };
  store.sessions.push(session);
  updateTable(input.tableId, { status: "occupied", currentSessionId: session.id });
  publish({ type: "SESSION_CREATED", session });
  return session;
}

export function getSession(id: string): Session | undefined {
  return getStore().sessions.find((s) => s.id === id);
}

export function callWaiter(sessionId: string): Session | undefined {
  const store = getStore();
  const idx = store.sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return undefined;
  store.sessions[idx] = { ...store.sessions[idx], callWaiter: true };
  publish({ type: "SESSION_UPDATED", session: store.sessions[idx] });
  updateTable(store.sessions[idx].tableId, { status: "calling" });
  return store.sessions[idx];
}

export function acknowledgeWaiter(sessionId: string): Session | undefined {
  const store = getStore();
  const idx = store.sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return undefined;
  store.sessions[idx] = { ...store.sessions[idx], callWaiter: false };
  publish({ type: "SESSION_UPDATED", session: store.sessions[idx] });
  updateTable(store.sessions[idx].tableId, { status: "occupied" });
  return store.sessions[idx];
}

export function closeSession(sessionId: string): Session | undefined {
  const store = getStore();
  const idx = store.sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return undefined;
  store.sessions[idx] = { ...store.sessions[idx], status: "closed" };
  publish({ type: "SESSION_UPDATED", session: store.sessions[idx] });
  updateTable(store.sessions[idx].tableId, {
    status: "available",
    currentSessionId: null,
  });
  return store.sessions[idx];
}

// ========= Menu =========
export function listMenu() {
  return getStore().menuItems;
}

// ========= Orders & Inventory =========
export function createOrder(input: {
  sessionId: string;
  items: { menuItemId: string; quantity: number; notes?: string }[];
}): Order {
  const store = getStore();
  const session = getSession(input.sessionId);
  if (!session) throw new Error("Session not found");

  const items: OrderLineItem[] = input.items.flatMap((i) => {
    const m = store.menuItems.find((x) => x.id === i.menuItemId);
    if (!m) return [];
    const line: OrderLineItem = {
      menuItemId: m.id,
      name: m.name,
      price: m.price,
      quantity: i.quantity,
    };
    if (i.notes) line.notes = i.notes;
    return [line];
  });

  if (items.length === 0) throw new Error("No valid items");

  const order: Order = {
    id: rid("O"),
    sessionId: session.id,
    tableId: session.tableId,
    items,
    status: "pending",
    inventoryDeductedAt: null,
    discountCode: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.orders.push(order);
  publish({ type: "ORDER_CREATED", order });
  return order;
}

export function updateOrderStatus(id: string, status: OrderStatus): Order | undefined {
  const store = getStore();
  const idx = store.orders.findIndex((o) => o.id === id);
  if (idx === -1) return undefined;
  store.orders[idx] = { ...store.orders[idx], status, updatedAt: Date.now() };
  publish({ type: "ORDER_UPDATED", order: store.orders[idx] });
  return store.orders[idx];
}

export function ordersForSession(sessionId: string): Order[] {
  return getStore().orders.filter((o) => o.sessionId === sessionId);
}

export function activeOrdersForKitchen(): Order[] {
  return getStore()
    .orders.filter((o) => o.status !== "served")
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function ordersForTable(tableId: string): Order[] {
  return getStore().orders.filter((o) => o.tableId === tableId);
}

// ========= Bill =========
export function calculateBill(sessionId: string) {
  const orders = ordersForSession(sessionId);
  const lineItems = orders.flatMap((o) => o.items);
  const subtotal = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const service = subtotal * 0.1;
  const tax = subtotal * 0.08;
  const total = subtotal + service + tax;
  return { subtotal, service, tax, total, lineItems };
}

// ========= Inventory =========
export function listInventory() {
  return getStore().inventory;
}

// ========= Menu management (admin) =========
export function createMenuItem(input: Omit<MenuItem, "id">): MenuItem {
  const store = getStore();
  const item: MenuItem = { ...input, id: rid("M") };
  store.menuItems.push(item);
  publish({ type: "MENU_UPDATED", items: [...store.menuItems] });
  return item;
}
export function updateMenuItem(id: string, patch: Partial<Omit<MenuItem, "id">>): MenuItem | undefined {
  const store = getStore();
  const idx = store.menuItems.findIndex((m) => m.id === id);
  if (idx === -1) return undefined;
  store.menuItems[idx] = { ...store.menuItems[idx], ...patch };
  publish({ type: "MENU_UPDATED", items: [...store.menuItems] });
  return store.menuItems[idx];
}
export function deleteMenuItem(id: string): boolean {
  const store = getStore();
  const before = store.menuItems.length;
  store.menuItems = store.menuItems.filter((m) => m.id !== id);
  if (store.menuItems.length === before) return false;
  publish({ type: "MENU_UPDATED", items: [...store.menuItems] });
  return true;
}

// ========= Staff management (admin) =========
export function listStaff(): Omit<StaffUser, "password">[] {
  return getStore().staff.map(({ password: _p, ...u }) => u);
}
export function createStaff(input: Omit<StaffUser, "id">): Omit<StaffUser, "password"> {
  const store = getStore();
  if (store.staff.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("Email already in use");
  }
  const user: StaffUser = { ...input, id: rid("U") };
  store.staff.push(user);
  publish({ type: "STAFF_UPDATED" });
  const { password: _p, ...safe } = user;
  return safe;
}
export function deleteStaff(id: string): boolean {
  const store = getStore();
  const before = store.staff.length;
  store.staff = store.staff.filter((u) => u.id !== id);
  if (store.staff.length === before) return false;
  publish({ type: "STAFF_UPDATED" });
  return true;
}

// ========= Tables management (admin) =========
export function createTable(input: Omit<Table, "id" | "status" | "currentSessionId">): Table {
  const store = getStore();
  const t: Table = { ...input, id: rid("T"), status: "available", currentSessionId: null };
  store.tables.push(t);
  publish({ type: "TABLE_UPDATED", table: t });
  return t;
}
export function deleteTable(id: string): boolean {
  const store = getStore();
  const t = store.tables.find((x) => x.id === id);
  if (!t) return false;
  if (t.currentSessionId) throw new Error("Table is in use");
  store.tables = store.tables.filter((x) => x.id !== id);
  publish({ type: "TABLE_UPDATED", table: { ...t, status: "available", currentSessionId: null } });
  return true;
}

// ========= Analytics (admin) =========
export function analytics() {
  const store = getStore();
  const totalOrders = store.orders.length;
  const revenue = store.orders.flatMap((o) => o.items).reduce((s, i) => s + i.price * i.quantity, 0);
  const activeSessions = store.sessions.filter((s) => s.status === "active").length;
  const occupied = store.tables.filter((t) => t.status !== "available").length;
  const byStatus = {
    pending: store.orders.filter((o) => o.status === "pending").length,
    preparing: store.orders.filter((o) => o.status === "preparing").length,
    ready: store.orders.filter((o) => o.status === "ready").length,
    served: store.orders.filter((o) => o.status === "served").length,
  };
  return { totalOrders, revenue, activeSessions, occupied, totalTables: store.tables.length, byStatus };
}

export function listAllOrders(): Order[] {
  return [...getStore().orders].sort((a, b) => b.createdAt - a.createdAt);
}
export function listAllSessions(): Session[] {
  return [...getStore().sessions].sort((a, b) => b.openedAt - a.openedAt);
}

