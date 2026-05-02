import type { Role } from "@/server/types";

// Tiny client auth store. Persists in localStorage.
// Two tokens: staff (after login) and customer (per table session).

const STAFF_KEY = "ros.staff.token";
const STAFF_USER_KEY = "ros.staff.user";
const CUSTOMER_KEY_PREFIX = "ros.customer.token."; // per tableId

export interface StaffUserInfo {
  id: string;
  name: string;
  email?: string;
  role: Role;
}

const isBrowser = () => typeof window !== "undefined";

export function getStaffToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(STAFF_KEY);
}
export function getStaffUser(): StaffUserInfo | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(STAFF_USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as StaffUserInfo; } catch { return null; }
}
export function setStaffSession(token: string, user: StaffUserInfo) {
  if (!isBrowser()) return;
  localStorage.setItem(STAFF_KEY, token);
  localStorage.setItem(STAFF_USER_KEY, JSON.stringify(user));
  notify();
}
export function clearStaffSession() {
  if (!isBrowser()) return;
  localStorage.removeItem(STAFF_KEY);
  localStorage.removeItem(STAFF_USER_KEY);
  notify();
}

export function getCustomerToken(tableId: string): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(CUSTOMER_KEY_PREFIX + tableId);
}
export function setCustomerToken(tableId: string, token: string) {
  if (!isBrowser()) return;
  localStorage.setItem(CUSTOMER_KEY_PREFIX + tableId, token);
}
export function clearCustomerToken(tableId: string) {
  if (!isBrowser()) return;
  localStorage.removeItem(CUSTOMER_KEY_PREFIX + tableId);
}

// Pub/sub for auth changes
type Listener = () => void;
const listeners = new Set<Listener>();
export function onAuthChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function notify() {
  for (const l of listeners) l();
}

// API fetch helper. Pass `tableId` to inject a customer token; otherwise sends staff token if present.
export async function apiFetch(
  input: string,
  init: RequestInit & { tableId?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const { tableId, ...rest } = init;
  let token: string | null = null;
  if (tableId) token = getCustomerToken(tableId);
  if (!token) token = getStaffToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...rest, headers });
}
