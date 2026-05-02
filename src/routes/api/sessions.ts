import { createFileRoute } from "@tanstack/react-router";
import { issueCustomerToken, readToken, requireStaff } from "@/server/auth";
import {
  acknowledgeWaiter,
  callWaiter,
  closeSession,
  createSession,
  getSession,
} from "@/server/services";

// Public: reads only require a valid token (staff or matching customer).
// Mutations: scoped per action.
export const Route = createFileRoute("/api/sessions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return new Response("id required", { status: 400 });
        const tok = readToken(request);
        if (!tok) return new Response("Unauthorized", { status: 401 });
        if (tok.kind === "customer" && tok.sessionId !== id) {
          return new Response("Forbidden", { status: 403 });
        }
        const s = getSession(id);
        if (!s) return new Response("not found", { status: 404 });
        return Response.json({ session: s });
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          action?: string;
          tableId?: string;
          mode?: "qr" | "waiter";
          guests?: number;
          sessionId?: string;
        } | null;
        if (!body) return new Response("invalid body", { status: 400 });

        // CUSTOMER: call waiter on own session
        if (body.action === "call_waiter" && body.sessionId) {
          const tok = readToken(request);
          if (!tok) return new Response("Unauthorized", { status: 401 });
          if (tok.kind === "customer" && tok.sessionId !== body.sessionId) {
            return new Response("Forbidden", { status: 403 });
          }
          // staff (waiter/admin) may also trigger
          if (tok.kind === "staff" && !["WAITER", "ADMIN", "KITCHEN"].includes(tok.role)) {
            return new Response("Forbidden", { status: 403 });
          }
          const s = callWaiter(body.sessionId);
          return Response.json({ session: s });
        }

        // WAITER/ADMIN: ack call or close session
        if (body.action === "ack_waiter" && body.sessionId) {
          const guard = requireStaff(request, ["WAITER", "ADMIN"]);
          if (guard instanceof Response) return guard;
          return Response.json({ session: acknowledgeWaiter(body.sessionId) });
        }
        if (body.action === "close" && body.sessionId) {
          const guard = requireStaff(request, ["WAITER", "ADMIN"]);
          if (guard instanceof Response) return guard;
          return Response.json({ session: closeSession(body.sessionId) });
        }

        // Open / join a session
        if (!body.tableId) return new Response("tableId required", { status: 400 });
        const mode = body.mode ?? "qr";

        if (mode === "waiter") {
          const guard = requireStaff(request, ["WAITER", "ADMIN"]);
          if (guard instanceof Response) return guard;
          const session = createSession({ tableId: body.tableId, mode, guests: body.guests });
          return Response.json({ session });
        }

        // QR (customer): no auth required — issue session-scoped token
        const session = createSession({ tableId: body.tableId, mode: "qr", guests: body.guests });
        const token = issueCustomerToken(session.id, session.tableId);
        return Response.json({ session, token });
      },
    },
  },
});
