import { createFileRoute } from "@tanstack/react-router";
import { loginStaff } from "@/server/auth";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as
          | { email?: string; password?: string }
          | null;
        if (!body?.email || !body?.password) {
          return new Response("email and password required", { status: 400 });
        }
        const result = loginStaff(body.email, body.password);
        if (!result) return new Response("Invalid credentials", { status: 401 });
        return Response.json(result);
      },
    },
  },
});
