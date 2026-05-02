import { useEffect, useRef } from "react";
import type { RosEvent } from "@/server/types";

type AnyEvent = RosEvent | { type: "HELLO"; t: number };

export function useRosEvents(handler: (event: AnyEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const es = new EventSource("/api/events");
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as AnyEvent;
        ref.current(data);
      } catch {
        // ignore
      }
    };
    es.onerror = () => {
      // browser auto-reconnects
    };
    return () => es.close();
  }, []);
}
