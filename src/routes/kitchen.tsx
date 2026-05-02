import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";
import { useRosEvents } from "@/lib/useRosEvents";
import { apiFetch } from "@/lib/auth";
import { StaffHeaderUser, useStaffGuard } from "@/lib/useStaffGuard";
import type { Order, OrderStatus } from "@/server/types";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen — Maison d'Ordre" },
      { name: "description", content: "Live kitchen orders display." },
    ],
  }),
  component: KitchenPage,
});

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  pending: "preparing",
  preparing: "ready",
  ready: "served",
  served: null,
};
const NEXT_LABEL: Record<OrderStatus, string> = {
  pending: "Start Cooking",
  preparing: "Mark Ready",
  ready: "Mark Served",
  served: "—",
};

function KitchenPage() {
  const user = useStaffGuard(["KITCHEN", "ADMIN"]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    const r = await apiFetch("/api/orders?kitchen=1");
    if (!r.ok) return;
    const j = (await r.json()) as { orders: Order[] };
    setOrders(j.orders);
  };

  useEffect(() => {
    if (user) load();
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [user]);

  useRosEvents((ev) => {
    if (ev.type === "ORDER_CREATED" || ev.type === "ORDER_UPDATED") load();
  });

  const advance = async (o: Order) => {
    const next = NEXT[o.status];
    if (!next) return;
    await apiFetch("/api/orders", {
      method: "PATCH",
      body: JSON.stringify({ id: o.id, status: next }),
    });
  };

  const groups: Record<OrderStatus, Order[]> = {
    pending: orders.filter((o) => o.status === "pending"),
    preparing: orders.filter((o) => o.status === "preparing"),
    ready: orders.filter((o) => o.status === "ready"),
    served: [],
  };

  const elapsedColor = (ts: number) => {
    const mins = (Date.now() - ts) / 60000;
    if (mins > 12) return "text-ember";
    if (mins > 6) return "text-bone";
    return "text-bone/60";
  };

  if (!user) return null;

  return (
    <div className="texture-charcoal min-h-screen text-bone">
      <header className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-bone/10">
        <div className="flex items-center gap-6 md:gap-10">
          <Link to="/" className="font-serif italic text-2xl">Maison d'Ordre</Link>
          <span className="uppercase-label text-bone/60 hidden md:inline">Kitchen Display</span>
        </div>
        <div className="flex gap-6 items-center">
          <span className="uppercase-label text-bone/60 tabular-nums hidden sm:inline">{new Date(now).toLocaleTimeString()}</span>
          <Link to="/waiter" className="uppercase-label text-bone/60 hover:text-bone">Floor</Link>
          <span className="uppercase-label text-bone/60 hidden md:inline">{user.name}</span>
          <button
            onClick={() => { import("@/lib/auth").then((m) => { m.clearStaffSession(); window.location.assign("/login"); }); }}
            className="uppercase-label text-bone/60 hover:text-bone"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-4 p-6 min-h-[calc(100vh-78px)]">
        {(["pending", "preparing", "ready"] as OrderStatus[]).map((col) => (
          <section key={col} className="flex flex-col">
            <header className="flex items-baseline justify-between pb-4 mb-4 border-b border-bone/15">
              <h2 className="font-serif text-3xl capitalize">
                {col === "pending" ? "New Orders" : col === "preparing" ? "Cooking" : "Ready to Serve"}
              </h2>
              <span className="uppercase-label text-bone/50">{groups[col].length}</span>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {groups[col].length === 0 && (
                <p className="text-bone/30 italic font-serif text-lg">— no orders —</p>
              )}
              {groups[col].map((o) => (
                <article
                  key={o.id}
                  className={`bg-bone text-charcoal animate-fade-in flex flex-col ${col === "ready" ? "outline outline-2 outline-moss" : ""}`}
                >
                  <header className="flex justify-between items-baseline px-4 py-3 border-b hairline">
                    <div>
                      <p className="uppercase-label text-charcoal/50">Table</p>
                      <p className="font-serif text-2xl italic leading-none">
                        {o.tableId.replace("T", "")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`uppercase-label tabular-nums ${col === "preparing" ? "text-ember" : "text-charcoal/50"}`}>
                        {timeAgo(o.createdAt)}
                      </p>
                      <p className="uppercase-label text-charcoal/40">#{o.id.slice(-4)}</p>
                    </div>
                  </header>
                  <ul className="px-4 py-3 space-y-2">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex justify-between text-base">
                        <span className="font-medium">
                          <span className="tabular-nums">{it.quantity}×</span> {it.name}
                        </span>
                        {it.notes && (
                          <span className="text-xs italic text-ember">{it.notes}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => advance(o)}
                    className={`uppercase-label py-3 transition-colors ${
                      col === "ready"
                        ? "bg-moss text-bone hover:opacity-90"
                        : col === "preparing"
                          ? "bg-ember text-bone hover:opacity-90"
                          : "bg-charcoal text-bone hover:bg-ink"
                    }`}
                  >
                    {NEXT_LABEL[o.status]}
                  </button>
                  <span className={`hidden ${elapsedColor(o.createdAt)}`} />
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
