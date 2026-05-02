import { getStore } from "./store";
import type { AuthToken, CustomerToken, Role, StaffToken } from "./types";

// Demo token: base64(JSON). NOT a real JWT — no signature verification.
// In production, replace with a signed JWT (HS256) using a server-side secret.
function b64encode(s: string): string {
  if (typeof btoa !== "undefined") return btoa(unescape(encodeURIComponent(s)));
  return Buffer.from(s, "utf-8").toString("base64");
}
function b64decode(s: string): string {
  try {
    if (typeof atob !== "undefined") return decodeURIComponent(escape(atob(s)));
    return Buffer.from(s, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export function signToken(payload: AuthToken): string {
  return b64encode(JSON.stringify(payload));
}

export function verifyToken(token: string | null | undefined): AuthToken | null {
  if (!token) return null;
  const raw = b64decode(token);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as AuthToken;
    if (obj.kind === "staff" && obj.userId && obj.role) return obj;
    if (obj.kind === "customer" && obj.sessionId && obj.tableId) return obj;
    return null;
  } catch {
    return null;
  }
}

export function readToken(request: Request): AuthToken | null {
  const h = request.headers.get("authorization");
  if (h && h.toLowerCase().startsWith("bearer ")) {
    return verifyToken(h.slice(7).trim());
  }
  // Fallback: x-ros-token header (used by SSE which can't set Authorization easily on EventSource)
  const x = request.headers.get("x-ros-token");
  if (x) return verifyToken(x);
  return null;
}

export function loginStaff(email: string, password: string): { token: string; user: { id: string; name: string; role: Role } } | null {
  const user = getStore().staff.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!user) return null;
  const tok: StaffToken = { kind: "staff", userId: user.id, role: user.role, iat: Date.now() };
  return { token: signToken(tok), user: { id: user.id, name: user.name, role: user.role } };
}

export function issueCustomerToken(sessionId: string, tableId: string): string {
  const tok: CustomerToken = { kind: "customer", sessionId, tableId, iat: Date.now() };
  return signToken(tok);
}

export function unauthorized(message = "Unauthorized"): Response {
  return new Response(message, { status: 401 });
}
export function forbidden(message = "Forbidden"): Response {
  return new Response(message, { status: 403 });
}

export function requireStaff(request: Request, roles: Role[]): { token: StaffToken } | Response {
  const tok = readToken(request);
  if (!tok) return unauthorized();
  if (tok.kind !== "staff") return forbidden();
  if (!roles.includes(tok.role)) return forbidden();
  return { token: tok };
}

export function requireCustomerForSession(request: Request, sessionId: string): { token: CustomerToken } | Response {
  const tok = readToken(request);
  if (!tok) return unauthorized();
  if (tok.kind !== "customer") return forbidden();
  if (tok.sessionId !== sessionId) return forbidden("Session mismatch");
  return { token: tok };
}
