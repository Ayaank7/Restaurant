import { createFileRoute } from "@tanstack/react-router";
import { requireStaff } from "@/server/auth";
import {
  analytics,
  createMenuItem,
  createStaff,
  createTable,
  deleteMenuItem,
  deleteStaff,
  deleteTable,
  listAllOrders,
  listAllSessions,
  listStaff,
  listTables,
  updateMenuItem,
} from "@/server/services";
import { getStore } from "@/server/store";
import type { Role } from "@/server/types";

const ADMIN: Role[] = ["ADMIN"];

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const guard = requireStaff(request, ADMIN);
        if (guard instanceof Response) return guard;
        const url = new URL(request.url);
        const view = url.searchParams.get("view");
        if (view === "analytics") return Response.json(analytics());
        if (view === "staff") return Response.json({ staff: listStaff() });
        if (view === "menu") return Response.json({ items: getStore().menuItems });
        if (view === "tables") return Response.json({ tables: listTables() });
        if (view === "orders") return Response.json({ orders: listAllOrders() });
        if (view === "sessions") return Response.json({ sessions: listAllSessions() });
        return Response.json({
          analytics: analytics(),
          staff: listStaff(),
          menu: getStore().menuItems,
          tables: listTables(),
        });
      },
      POST: async ({ request }) => {
        const guard = requireStaff(request, ADMIN);
        if (guard instanceof Response) return guard;
        const body = (await request.json().catch(() => null)) as {
          resource?: string;
          action?: string;
          payload?: Record<string, unknown>;
        } | null;
        if (!body?.resource || !body?.action) return new Response("invalid", { status: 400 });
        try {
          if (body.resource === "menu") {
            if (body.action === "create") {
              const p = body.payload as {
                name: string; description: string; price: number; category: string; image: string; tag?: string;
              };
              if (!p?.name || !p?.category || !p?.image || !Number.isFinite(p?.price)) {
                return new Response("missing fields", { status: 400 });
              }
              return Response.json({ item: createMenuItem({
                name: String(p.name).slice(0, 80),
                description: String(p.description ?? "").slice(0, 240),
                price: Math.max(0, Number(p.price)),
                category: String(p.category).slice(0, 40),
                image: String(p.image).slice(0, 60),
                ...(p.tag ? { tag: String(p.tag).slice(0, 24) } : {}),
              }) });
            }
            if (body.action === "update") {
              const p = body.payload as { id: string } & Partial<Record<string, unknown>>;
              const updated = updateMenuItem(p.id, p as never);
              if (!updated) return new Response("not found", { status: 404 });
              return Response.json({ item: updated });
            }
            if (body.action === "delete") {
              const p = body.payload as { id: string };
              return Response.json({ ok: deleteMenuItem(p.id) });
            }
          }
          if (body.resource === "staff") {
            if (body.action === "create") {
              const p = body.payload as { name: string; email: string; password: string; role: "WAITER" | "KITCHEN" | "ADMIN" };
              if (!p?.name || !p?.email || !p?.password || !p?.role) return new Response("missing fields", { status: 400 });
              if (!["WAITER", "KITCHEN", "ADMIN"].includes(p.role)) return new Response("bad role", { status: 400 });
              return Response.json({ user: createStaff({
                name: String(p.name).slice(0, 60),
                email: String(p.email).slice(0, 120),
                password: String(p.password).slice(0, 60),
                role: p.role,
              }) });
            }
            if (body.action === "delete") {
              const p = body.payload as { id: string };
              if (p.id === guard.token.userId) return new Response("cannot delete self", { status: 400 });
              return Response.json({ ok: deleteStaff(p.id) });
            }
          }
          if (body.resource === "tables") {
            if (body.action === "create") {
              const p = body.payload as { label: string; capacity: number; zone: string };
              if (!p?.label || !Number.isFinite(p?.capacity)) return new Response("missing fields", { status: 400 });
              return Response.json({ table: createTable({
                label: String(p.label).slice(0, 12),
                capacity: Math.max(1, Math.min(20, Math.floor(p.capacity))),
                zone: String(p.zone ?? "Main Floor").slice(0, 30),
              }) });
            }
            if (body.action === "delete") {
              const p = body.payload as { id: string };
              return Response.json({ ok: deleteTable(p.id) });
            }
          }
          return new Response("unknown action", { status: 400 });
        } catch (e) {
          return new Response((e as Error).message, { status: 400 });
        }
      },
    },
  },
});
