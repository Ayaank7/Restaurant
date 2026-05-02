import { createFileRoute } from "@tanstack/react-router";
import { listMenu } from "@/server/services";

export const Route = createFileRoute("/api/menu")({
  server: {
    handlers: {
      GET: async () => Response.json({ items: listMenu() }),
    },
  },
});
