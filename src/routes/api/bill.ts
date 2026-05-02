import { createFileRoute } from "@tanstack/react-router";
import { calculateBill } from "@/server/services";
import { readToken, requireStaff } from "@/server/auth";
import { BillingService } from "../../server/services/BillingService";

export const Route = createFileRoute("/api/bill")({
  server: {
    handlers: {
      // ==========================================
      // LEGACY GET: Keeps your current UI working
      // ==========================================
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) return new Response("sessionId required", { status: 400 });

        const tok = readToken(request);
        if (!tok) return new Response("Unauthorized", { status: 401 });
        if (tok.kind === "customer" && tok.sessionId !== sessionId) {
          return new Response("Forbidden", { status: 403 });
        }

        // Returns the standard bill format your frontend currently expects
        return Response.json(calculateBill(sessionId));
      },

      // ==========================================
      // ENTERPRISE POST: The Taxation & Discount Engine
      // ==========================================
      POST: async ({ request }) => {
        // Only Waiters and Admins can apply manual discounts/recalculate enterprise bills
        const guard = requireStaff(request, ["WAITER", "ADMIN"]);
        if (guard instanceof Response) return guard;

        const body = (await request.json().catch(() => null)) as {
          orderId?: string;
          discountCode?: string;
        } | null;

        if (!body?.orderId) {
          return new Response("orderId required for enterprise billing", { status: 400 });
        }

        try {
          // Triggers the complex math engine we built in BillingService
          const itemizedBill = await BillingService.calculateBill(body.orderId, body.discountCode);

          return Response.json({
            success: true,
            message: body.discountCode
              ? `Discount ${body.discountCode} applied successfully!`
              : "Bill calculated.",
            enterpriseBill: itemizedBill, // Contains subTotal, taxAmount, discountAmount, and grandTotal
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to calculate bill";
          return new Response(message, { status: 400 });
        }
      },
    },
  },
});
