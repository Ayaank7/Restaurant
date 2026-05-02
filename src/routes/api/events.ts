import { createFileRoute } from "@tanstack/react-router";
import { subscribe } from "@/server/events";

export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: async () => {
        const stream = new ReadableStream({
          start(controller) {
            const enc = new TextEncoder();
            const send = (data: unknown) => {
              controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
            };
            send({ type: "HELLO", t: Date.now() });

            const unsub = subscribe((event) => {
              try {
                send(event);
              } catch {
                // closed
              }
            });

            // Heartbeat to keep connection alive
            const heartbeat = setInterval(() => {
              try {
                controller.enqueue(enc.encode(`: ping\n\n`));
              } catch {
                clearInterval(heartbeat);
              }
            }, 15000);

            // @ts-expect-error attach for cleanup
            controller._cleanup = () => {
              clearInterval(heartbeat);
              unsub();
            };
          },
          cancel() {
            // Best effort cleanup; subscriber leak is bounded by process lifetime
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
