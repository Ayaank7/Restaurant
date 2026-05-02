import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { dishImage } from "@/lib/dishImages";
import { formatMoney } from "@/lib/format";
import { useRosEvents } from "@/lib/useRosEvents";
import { apiFetch, setCustomerToken } from "@/lib/auth";
import type { MenuItem, Order, Session, Table } from "@/server/types";

export const Route = createFileRoute("/t/$tableId")({
  head: ({ params }) => ({
    meta: [
      { title: `Table ${params.tableId} — Maison d'Ordre` },
      { name: "description", content: "Order from your table." },
    ],
  }),
  component: GuestPage,
});

interface CartLine { menuItemId: string; quantity: number; }
interface Bill { subtotal: number; service: number; tax: number; total: number; }

function GuestPage() {
  const { tableId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bill, setBill] = useState<Bill | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCat, setActiveCat] = useState<string>("Openers");
  const [showCart, setShowCart] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<Table | null>(null);
  const initialized = useRef(false);

  // Init: open/reuse session for this table, fetch menu, store customer token
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      const [sRes, mRes, tRes] = await Promise.all([
        fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableId, mode: "qr" }),
        }),
        fetch("/api/menu"),
        fetch("/api/tables"),
      ]);
      const sJson = (await sRes.json()) as { session: Session; token?: string };
      const mJson = (await mRes.json()) as { items: MenuItem[] };
      const tJson = (await tRes.json()) as { tables: Table[] };
      if (sJson.token) setCustomerToken(tableId, sJson.token);
      setSession(sJson.session);
      setMenu(mJson.items);
      setTableInfo(tJson.tables.find((t) => t.id === tableId) ?? null);
    })();
  }, [tableId]);

  // Fetch orders & bill when session available — token-scoped
  const refresh = async (sid: string) => {
    const [oRes, bRes] = await Promise.all([
      apiFetch(`/api/orders?sessionId=${sid}`, { tableId }),
      apiFetch(`/api/bill?sessionId=${sid}`, { tableId }),
    ]);
    const oJson = (await oRes.json()) as { orders: Order[] };
    const bJson = (await bRes.json()) as Bill;
    setOrders(oJson.orders);
    setBill(bJson);
  };

  useEffect(() => {
    if (session) refresh(session.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useRosEvents((event) => {
    if (!session) return;
    if (event.type === "ORDER_CREATED" || event.type === "ORDER_UPDATED") {
      if (event.order.sessionId === session.id) refresh(session.id);
    }
    if (event.type === "SESSION_UPDATED" && event.session.id === session.id) {
      setSession(event.session);
    }
  });

  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.category));
    return Array.from(set);
  }, [menu]);

  const cartLines: (CartLine & { item: MenuItem })[] = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, quantity]) => {
      const item = menu.find((m) => m.id === id)!;
      return { menuItemId: id, quantity, item };
    });

  const cartCount = cartLines.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.item.price * l.quantity, 0);

  const addItem = (id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    setToast("Added");
    setTimeout(() => setToast(null), 1200);
  };
  const removeItem = (id: string) => {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));
  };

  const placeOrder = async () => {
    if (!session || cartLines.length === 0) return;
    await apiFetch("/api/orders", {
      method: "POST",
      tableId,
      body: JSON.stringify({
        sessionId: session.id,
        items: cartLines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      }),
    });
    setCart({});
    setShowCart(false);
    setToast("Order sent to the kitchen");
    setTimeout(() => setToast(null), 2000);
  };

  const callWaiter = async () => {
    if (!session) return;
    await apiFetch("/api/sessions", {
      method: "POST",
      tableId,
      body: JSON.stringify({ action: "call_waiter", sessionId: session.id }),
    });
    setToast("Your server is on the way");
    setTimeout(() => setToast(null), 2200);
  };

  const filtered = menu.filter((m) => m.category === activeCat);

  const statusLabel = (s: Order["status"]) => {
    return { pending: "Order received", preparing: "Cooking now", ready: "Ready to serve", served: "Served" }[s];
  };
  const statusDot = (s: Order["status"]) => {
    return {
      pending: "bg-charcoal/30",
      preparing: "bg-ember animate-pulse",
      ready: "bg-moss",
      served: "bg-charcoal/50",
    }[s];
  };

  return (
    <div className="texture-linen min-h-screen pb-32">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate({ to: "/" })}
            className="uppercase-label text-charcoal/50"
          >
            ← Home
          </button>
          <span className="uppercase-label text-charcoal/50">Table {tableInfo?.label ?? tableId}</span>
        </div>
        <p className="uppercase-label text-ember mb-3">Menu</p>
        <h1 className="font-serif text-5xl leading-none">What would you like?</h1>
        <p className="font-serif italic text-charcoal/60 mt-2 text-lg">Tap + to add. Send to kitchen when ready.</p>
      </div>

      {/* Categories */}
      <div className="sticky top-0 z-10 bg-bone/90 backdrop-blur border-y hairline">
        <div className="flex gap-6 px-5 py-4 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`uppercase-label whitespace-nowrap pb-1 border-b transition-colors ${
                activeCat === cat
                  ? "text-charcoal border-charcoal"
                  : "text-charcoal/40 border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="px-5 pt-6 space-y-4">
        {filtered.map((item) => {
          const qty = cart[item.id] ?? 0;
          return (
            <article
              key={item.id}
              className="animate-fade-in flex gap-4 bg-bone border hairline p-3 hover:shadow-md transition-shadow"
            >
              {/* Small thumbnail */}
              <div className="shrink-0 size-24 overflow-hidden bg-bone-dark rounded-sm">
                <img
                  src={dishImage(item.image)}
                  alt={item.name}
                  width={200}
                  height={200}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-serif text-lg leading-tight">{item.name}</h3>
                  <span className="tabular-nums font-medium text-sm shrink-0">{formatMoney(item.price)}</span>
                </div>
                <p className="text-xs text-charcoal/60 leading-snug mt-1 line-clamp-2">{item.description}</p>
                <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                  {item.tag ? (
                    <span className="uppercase-label text-ember text-[0.6rem]">{item.tag}</span>
                  ) : <span />}
                  {qty > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label="Remove one"
                        className="size-8 border border-charcoal/30 hover:border-charcoal transition-colors"
                      >
                        −
                      </button>
                      <span className="font-serif text-base tabular-nums w-5 text-center">{qty}</span>
                      <button
                        onClick={() => addItem(item.id)}
                        aria-label="Add one"
                        className="size-8 bg-charcoal text-bone hover:bg-ink transition-colors"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addItem(item.id)}
                      className="px-4 py-2 bg-charcoal text-bone uppercase-label text-[0.65rem] hover:bg-ink transition-all"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Live status */}
      {orders.length > 0 && (
        <div className="px-5 mt-16 pt-10 border-t hairline">
          <p className="uppercase-label text-charcoal/50 mb-5">Your Order</p>
          <div className="space-y-4">
            {orders.flatMap((o) =>
              o.items.map((it, idx) => (
                <div
                  key={`${o.id}-${idx}`}
                  className="flex items-center justify-between border-b hairline pb-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`size-2 rounded-full ${statusDot(o.status)}`} />
                    <div>
                      <p className="font-medium">
                        {it.quantity}× {it.name}
                      </p>
                      <p className="text-xs text-charcoal/50 uppercase-label">
                        {statusLabel(o.status)}
                      </p>
                    </div>
                  </div>
                  <span className="tabular-nums text-sm">
                    {formatMoney(it.price * it.quantity)}
                  </span>
                </div>
              )),
            )}
          </div>
          {bill && (
            <div className="mt-6 space-y-1 text-sm">
              <div className="flex justify-between text-charcoal/60">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatMoney(bill.subtotal)}</span>
              </div>
              <div className="flex justify-between text-charcoal/60">
                <span>Service (10%)</span>
                <span className="tabular-nums">{formatMoney(bill.service)}</span>
              </div>
              <div className="flex justify-between text-charcoal/60">
                <span>Tax</span>
                <span className="tabular-nums">{formatMoney(bill.tax)}</span>
              </div>
              <div className="flex justify-between font-serif text-2xl mt-3 pt-3 border-t hairline">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(bill.total)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-bone border-t hairline px-5 py-4 flex items-center gap-3 z-20">
        <button
          onClick={callWaiter}
          className="px-4 py-3 border border-charcoal/30 uppercase-label hover:border-charcoal transition-colors"
        >
          {session?.callWaiter ? "Calling…" : "Call Waiter"}
        </button>
        {cartCount > 0 && (
          <button
            onClick={() => setShowCart(true)}
            className="flex-1 bg-charcoal text-bone px-5 py-3 flex justify-between items-center hover:bg-ink transition-colors"
          >
            <span className="uppercase-label">Review & Order · {cartCount}</span>
            <span className="tabular-nums font-medium">{formatMoney(cartTotal)}</span>
          </button>
        )}
        {cartCount === 0 && (
          <span className="flex-1 text-center uppercase-label text-charcoal/40">
            Tap + on items to start
          </span>
        )}
      </div>

      {/* Cart sheet */}
      {showCart && (
        <div className="fixed inset-0 z-30 bg-charcoal/40 animate-fade-in" onClick={() => setShowCart(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-bone p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-charcoal/15 rounded-full mx-auto mb-6" />
            <h2 className="font-serif text-3xl mb-2">Review your order</h2>
            <p className="text-sm text-charcoal/60 mb-6">Check items below, then send to the kitchen.</p>
            <div className="space-y-3 mb-6">
              {cartLines.map((l) => (
                <div key={l.menuItemId} className="flex justify-between border-b hairline pb-3">
                  <div>
                    <p className="font-medium">{l.item.name}</p>
                    <p className="text-xs text-charcoal/50 uppercase-label">
                      {l.quantity} × {formatMoney(l.item.price)}
                    </p>
                  </div>
                  <span className="tabular-nums">
                    {formatMoney(l.item.price * l.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-serif text-2xl mb-6">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMoney(cartTotal)}</span>
            </div>
            <button
              onClick={placeOrder}
              className="w-full py-4 bg-charcoal text-bone uppercase-label hover:bg-ink transition-colors"
            >
              Send Order to Kitchen
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 bg-charcoal text-bone px-5 py-3 uppercase-label animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
