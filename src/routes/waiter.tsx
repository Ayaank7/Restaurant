import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatMoney, timeAgo } from "@/lib/format";
import { useRosEvents } from "@/lib/useRosEvents";
import { apiFetch } from "@/lib/auth";
import { StaffHeaderUser, useStaffGuard } from "@/lib/useStaffGuard";
import type { Order, Session, Table } from "@/server/types";

export const Route = createFileRoute("/waiter")({
  head: () => ({
    meta: [
      { title: "Floor — Maison d'Ordre" },
      { name: "description", content: "Waiter floor dashboard." },
    ],
  }),
  component: WaiterPage,
});

interface Bill { subtotal: number; service: number; tax: number; total: number; }

function WaiterPage() {
  const user = useStaffGuard(["WAITER", "ADMIN"]);
  const navigate = useNavigate();
  const [tables, setTables] = useState<Table[]>([]);
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(i);
  }, []);

  const loadTables = async () => {
    const r = await apiFetch("/api/tables");
    const j = (await r.json()) as { tables: Table[] };
    setTables(j.tables);
    const updates: Record<string, Session> = {};
    await Promise.all(
      j.tables
        .filter((t) => t.currentSessionId)
        .map(async (t) => {
          const sr = await apiFetch(`/api/sessions?id=${t.currentSessionId}`);
          if (sr.ok) {
            const sj = (await sr.json()) as { session: Session };
            updates[t.id] = sj.session;
          }
        }),
    );
    setSessions(updates);
  };

  useEffect(() => {
    if (user) loadTables();
  }, [user]);

  const loadDetail = async (tableId: string) => {
    const t = tables.find((x) => x.id === tableId);
    if (!t || !t.currentSessionId) {
      setOrders([]);
      setBill(null);
      return;
    }
    const [oRes, bRes] = await Promise.all([
      apiFetch(`/api/orders?sessionId=${t.currentSessionId}`),
      apiFetch(`/api/bill?sessionId=${t.currentSessionId}`),
    ]);
    setOrders(((await oRes.json()) as { orders: Order[] }).orders);
    setBill((await bRes.json()) as Bill);
  };

  useEffect(() => {
    if (selected) loadDetail(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tables]);

  useRosEvents((ev) => {
    if (ev.type === "TABLE_UPDATED" || ev.type === "SESSION_CREATED" || ev.type === "SESSION_UPDATED") {
      loadTables();
    }
    if (ev.type === "ORDER_CREATED" || ev.type === "ORDER_UPDATED") {
      if (selected && ev.order.tableId === selected) loadDetail(selected);
    }
  });

  const seat = async (tableId: string) => {
    await apiFetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ tableId, mode: "waiter", guests: 2 }),
    });
    setSelected(tableId);
  };

  const ackCall = async (sessionId: string) => {
    await apiFetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ action: "ack_waiter", sessionId }),
    });
  };

  const closeT = async (sessionId: string) => {
    await apiFetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ action: "close", sessionId }),
    });
    setSelected(null);
  };

  const statusStyle = (status: Table["status"]) => {
    if (status === "calling") return "bg-ember text-bone";
    if (status === "occupied") return "bg-charcoal text-bone";
    if (status === "billing") return "bg-moss text-bone";
    return "bg-bone text-charcoal/40 border border-charcoal/10";
  };

  const selectedTable = tables.find((t) => t.id === selected);
  const selectedSession = selectedTable?.currentSessionId
    ? sessions[selectedTable.id]
    : undefined;

  if (!user) return null;

  return (
    <div className="texture-linen min-h-screen text-charcoal">
      <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b hairline">
        <div className="flex items-center gap-6 md:gap-12">
          <Link to="/" className="font-serif italic text-2xl">Maison d'Ordre</Link>
          <span className="uppercase-label text-charcoal/60 hidden md:inline">Floor · Evening Shift</span>
        </div>
        <div className="flex gap-6 uppercase-label items-center">
          <Link to="/waiter" className="text-charcoal border-b border-charcoal pb-1">Floor</Link>
          <Link to="/kitchen" className="text-charcoal/50 hover:text-charcoal">Kitchen</Link>
          <StaffHeaderUser user={user} />
        </div>
      </header>

      <div className="grid grid-cols-12 gap-12 px-12 py-10">
        {/* Floor grid */}
        <section className="col-span-12 lg:col-span-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="font-serif text-4xl">Dining Room</h1>
              <p className="font-serif italic text-charcoal/60 mt-1">
                {tables.filter((t) => t.status !== "available").length} of {tables.length} tables in service
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {tables.map((t) => {
              const sess = sessions[t.id];
              const isSel = selected === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={`aspect-square p-6 flex flex-col justify-between text-left transition-all hover:scale-[1.01] ${statusStyle(t.status)} ${isSel ? "ring-2 ring-ember ring-offset-4 ring-offset-bone" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-serif text-3xl italic">{t.label}</span>
                    {t.status === "calling" && (
                      <span className="size-2 rounded-full bg-bone animate-pulse mt-3" />
                    )}
                  </div>
                  <div>
                    <p className="uppercase-label opacity-80">{t.zone}</p>
                    <p className="text-sm mt-1">
                      {t.status === "available"
                        ? `${t.capacity} seats`
                        : sess
                          ? `${sess.guests} guests · ${timeAgo(sess.openedAt)}`
                          : "Occupied"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Detail rail */}
        <aside className="col-span-12 lg:col-span-4 lg:border-l hairline lg:pl-12">
          {!selectedTable && (
            <div className="text-center py-24 text-charcoal/40">
              <p className="font-serif italic text-2xl">Select a table</p>
            </div>
          )}
          {selectedTable && (
            <div>
              <p className="uppercase-label text-charcoal/50 mb-2">Table</p>
              <h2 className="font-serif text-5xl italic">{selectedTable.label}</h2>
              <p className="text-charcoal/60 mt-1">{selectedTable.zone} · {selectedTable.capacity} seats</p>

              {selectedTable.status === "available" && (
                <button
                  onClick={() => seat(selectedTable.id)}
                  className="mt-8 w-full py-4 bg-charcoal text-bone uppercase-label hover:bg-ink transition-colors"
                >
                  Seat Guests
                </button>
              )}

              {selectedSession && selectedSession.callWaiter && (
                <div className="mt-6 p-4 bg-ember/10 border border-ember/30 flex items-center justify-between">
                  <div>
                    <p className="uppercase-label text-ember">Guest Calling</p>
                    <p className="font-serif italic">"Need assistance"</p>
                  </div>
                  <button
                    onClick={() => ackCall(selectedSession.id)}
                    className="px-4 py-2 bg-ember text-bone uppercase-label"
                  >
                    On My Way
                  </button>
                </div>
              )}

              {selectedSession && (
                <>
                  <div className="mt-8 flex gap-3">
                    <button
                      onClick={() => navigate({ to: "/t/$tableId", params: { tableId: selectedTable.id } })}
                      className="flex-1 py-3 border border-charcoal/30 uppercase-label hover:border-charcoal transition-colors"
                    >
                      Take Order
                    </button>
                    <button
                      onClick={() => closeT(selectedSession.id)}
                      className="px-4 py-3 border border-charcoal/30 uppercase-label hover:border-charcoal transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-10">
                    <p className="uppercase-label text-charcoal/50 mb-4">Course Progress</p>
                    {orders.length === 0 && (
                      <p className="text-sm text-charcoal/50 italic">No orders yet</p>
                    )}
                    <div className="space-y-3">
                      {orders.map((o) => (
                        <div key={o.id} className="border-b hairline pb-3">
                          <div className="flex justify-between uppercase-label text-charcoal/50 mb-2">
                            <span>{o.id.slice(-4)}</span>
                            <span>{o.status}</span>
                          </div>
                          {o.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-sm py-0.5">
                              <span>{it.quantity}× {it.name}</span>
                              <span className="tabular-nums text-charcoal/60">
                                {formatMoney(it.price * it.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {bill && bill.subtotal > 0 && (
                    <div className="mt-8 pt-6 border-t hairline">
                      <div className="flex justify-between font-serif text-3xl">
                        <span>Total</span>
                        <span className="tabular-nums">{formatMoney(bill.total)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-bone/95 backdrop-blur border-t hairline px-12 py-3 flex justify-between items-center text-charcoal/50 uppercase-label">
        <span>Service Active · {new Date(now).toLocaleTimeString()}</span>
        <span>Live · Real-time updates</span>
      </footer>
    </div>
  );
}
