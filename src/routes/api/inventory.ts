import { createFileRoute } from "@tanstack/react-router";
import { listInventory } from "@/server/services";
import { requireStaff } from "@/server/auth";

export const Route = createFileRoute("/api/inventory")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const guard = requireStaff(request, ["ADMIN", "KITCHEN"]);
        if (guard instanceof Response) return guard;
        return Response.json({ inventory: listInventory() });
      },
    },
  },
});
