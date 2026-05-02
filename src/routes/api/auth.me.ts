import { createFileRoute } from "@tanstack/react-router";
import { readToken } from "@/server/auth";
import { getStore } from "@/server/store";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const tok = readToken(request);
        if (!tok) return new Response("Unauthorized", { status: 401 });
        if (tok.kind === "staff") {
          const u = getStore().staff.find((x) => x.id === tok.userId);
          if (!u) return new Response("Unauthorized", { status: 401 });
          return Response.json({
            kind: "staff",
            user: { id: u.id, name: u.name, email: u.email, role: u.role },
          });
        }
        return Response.json({ kind: "customer", sessionId: tok.sessionId, tableId: tok.tableId });
      },
    },
  },
});
