import type { RosEvent } from "./types";

// Simple in-memory pub/sub for SSE streams.
type Subscriber = (event: RosEvent) => void;

const g = globalThis as unknown as {
  __rosSubs?: Set<Subscriber>;
  __rosHistory?: { id: number; event: RosEvent }[];
  __rosNextId?: number;
};

if (!g.__rosSubs) g.__rosSubs = new Set();
if (!g.__rosHistory) g.__rosHistory = [];
if (typeof g.__rosNextId !== "number") g.__rosNextId = 1;

export function subscribe(fn: Subscriber): () => void {
  g.__rosSubs!.add(fn);
  return () => g.__rosSubs!.delete(fn);
}

export function publish(event: RosEvent) {
  const id = g.__rosNextId!++;
  g.__rosHistory!.push({ id, event });
  // keep history bounded
  if (g.__rosHistory!.length > 200) g.__rosHistory!.shift();
  for (const fn of g.__rosSubs!) {
    try {
      fn(event);
    } catch {
      // ignore
    }
  }
}
