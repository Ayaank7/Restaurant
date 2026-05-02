import { createFileRoute } from "@tanstack/react-router";
import { listTables } from "@/server/services";

// Menu and tables are public reads (needed for QR flow before token exists).
export const Route = createFileRoute("/api/tables")({
  server: {
    handlers: {
      GET: async () => Response.json({ tables: listTables() }),
    },
  },
});
