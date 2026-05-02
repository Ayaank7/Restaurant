import { createFileRoute } from "@tanstack/react-router";
import { readToken, requireStaff } from "@/server/auth";
import { InventoryService } from "../../server/services/InventoryService";
import {
  activeOrdersForKitchen,
  createOrder,
  ordersForSession,
  updateOrderStatus,
} from "@/server/services";
import type { OrderStatus } from "@/server/types";

const VALID_STATUS: OrderStatus[] = ["pending", "preparing", "ready", "served"];

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get("sessionId");
        const kitchen = url.searchParams.get("kitchen");

        if (kitchen) {
          const guard = requireStaff(request, ["KITCHEN", "WAITER", "ADMIN"]);
          if (guard instanceof Response) return guard;
          return Response.json({ orders: activeOrdersForKitchen() });
        }
        if (sessionId) {
          const tok = readToken(request);
          if (!tok) return new Response("Unauthorized", { status: 401 });
          if (tok.kind === "customer" && tok.sessionId !== sessionId) {
            return new Response("Forbidden", { status: 403 });
          }
          return Response.json({ orders: ordersForSession(sessionId) });
        }
        return new Response("sessionId or kitchen required", { status: 400 });
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          sessionId?: string;
          items?: { menuItemId: string; quantity: number; notes?: string }[];
        } | null;
        if (!body?.sessionId || !Array.isArray(body.items)) {
          return new Response("invalid body", { status: 400 });
        }
        const tok = readToken(request);
        if (!tok) return new Response("Unauthorized", { status: 401 });
        if (tok.kind === "customer" && tok.sessionId !== body.sessionId) {
          return new Response("Forbidden", { status: 403 });
        }
        // staff allowed: WAITER, ADMIN
        if (tok.kind === "staff" && !["WAITER", "ADMIN"].includes(tok.role)) {
          return new Response("Forbidden", { status: 403 });
        }
        // input sanitization
        const items = body.items
          .filter(
            (i) =>
              typeof i.menuItemId === "string" && Number.isFinite(i.quantity) && i.quantity > 0,
          )
          .map((i) => ({
            menuItemId: i.menuItemId,
            quantity: Math.min(20, Math.floor(i.quantity)),
            ...(i.notes ? { notes: String(i.notes).slice(0, 200) } : {}),
          }));
        if (items.length === 0) return new Response("no items", { status: 400 });
        try {
          const order = createOrder({ sessionId: body.sessionId, items });
          return Response.json({ order });
        } catch (e) {
          return new Response((e as Error).message, { status: 400 });
        }
      },
      PATCH: async ({ request }) => {
        // KITCHEN only (and ADMIN). Customers and waiters cannot mutate order status.
        const guard = requireStaff(request, ["KITCHEN", "ADMIN"]);
        if (guard instanceof Response) return guard;
        const body = (await request.json().catch(() => null)) as {
          id?: string;
          status?: OrderStatus;
        } | null;
        if (!body?.id || !body?.status || !VALID_STATUS.includes(body.status)) {
          return new Response("invalid", { status: 400 });
        }
        const o = updateOrderStatus(body.id, body.status);
        if (!o) return new Response("not found", { status: 404 });

        // ==========================================

        // ENTERPRISE LOGIC: BILL OF MATERIALS YIELD
        // ==========================================
        if (o.status === "served") {
          try {
            await InventoryService.deductInventoryForOrder(o.id);
            console.log(`[Inventory] Successfully deducted raw materials for Order: ${o.id}`);
          } catch (error) {
            console.error(`[Inventory Error] Failed to deduct for Order ${o.id}:`, error);
            // We log the error but DO NOT return a 500 response.
            // This ensures the kitchen screen successfully updates even if inventory fails.
          }
        }
        // ==========================================

        return Response.json({ order: o });
      },
    },
  },
});
