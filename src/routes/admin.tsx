import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import { StaffHeaderUser, useStaffGuard } from "@/lib/useStaffGuard";
import { useRosEvents } from "@/lib/useRosEvents";
import { dishImage } from "@/lib/dishImages";
import { formatMoney } from "@/lib/format";
import type { MenuItem, Order, Session, Table } from "@/server/types";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Maison d'Ordre" }] }),
  component: AdminPage,
});

type StaffRow = { id: string; name: string; email: string; role: "ADMIN" | "WAITER" | "KITCHEN" };
type Analytics = {
  totalOrders: number;
  revenue: number;
  activeSessions: number;
  occupied: number;
  totalTables: number;
  byStatus: { pending: number; preparing: number; ready: number; served: number };
};

type Tab = "overview" | "menu" | "inventory" | "staff" | "payroll" | "tables" | "orders";

function AdminPage() {
  const user = useStaffGuard(["ADMIN"]);
  const [tab, setTab] = useState<Tab>("overview");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const refresh = async () => {
    const [a, m, s, t, o, ss] = await Promise.all([
      apiFetch("/api/admin?view=analytics").then((r) => r.json()),
      apiFetch("/api/admin?view=menu").then((r) => r.json()),
      apiFetch("/api/admin?view=staff").then((r) => r.json()),
      apiFetch("/api/admin?view=tables").then((r) => r.json()),
      apiFetch("/api/admin?view=orders").then((r) => r.json()),
      apiFetch("/api/admin?view=sessions").then((r) => r.json()),
    ]);
    setAnalytics(a);
    setMenu(m.items);
    setStaff(s.staff);
    setTables(t.tables);
    setOrders(o.orders);
    setSessions(ss.sessions);
  };

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  useRosEvents(() => {
    if (user) refresh();
  });

  if (!user) return null;

  return (
    <div className="texture-linen min-h-screen text-charcoal">
      <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b hairline">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-serif italic text-2xl">
            Maison d'Ordre
          </Link>
          <span className="uppercase-label text-charcoal/60">Admin Console</span>
        </div>
        <StaffHeaderUser user={user} />
      </header>

      <div className="grid grid-cols-12 min-h-[calc(100vh-72px)]">
        <nav className="col-span-12 md:col-span-2 border-r hairline p-4 md:p-6 space-y-1">
          {(["overview", "menu", "inventory", "staff", "payroll", "tables", "orders"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`block w-full text-left uppercase-label py-2 px-3 transition-colors ${
                tab === t ? "bg-charcoal text-bone" : "text-charcoal/60 hover:bg-bone-dark/40"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <main className="col-span-12 md:col-span-10 p-6 md:p-10">
          {tab === "overview" && <Overview a={analytics} sessions={sessions} />}
          {tab === "menu" && <MenuAdmin items={menu} onChange={refresh} />}
          {tab === "inventory" && <InventoryAdmin />}
          {tab === "staff" && <StaffAdmin items={staff} onChange={refresh} selfId={user.id} />}
          {tab === "payroll" && <PayrollAdmin />}
          {tab === "tables" && <TablesAdmin items={tables} onChange={refresh} />}
          {tab === "orders" && <OrdersView items={orders} onChange={refresh} />}
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-bone border hairline p-6">
      <p className="uppercase-label text-charcoal/50">{label}</p>
      <p className="font-serif text-4xl mt-2 tabular-nums">{value}</p>
    </div>
  );
}

function Overview({ a, sessions }: { a: Analytics | null; sessions: Session[] }) {
  if (!a) return <p className="text-charcoal/50 italic font-serif">Loading…</p>;
  
  const estimatedFoodCost = a.revenue * 0.28; 
  const estimatedLaborCost = a.revenue * 0.22; 
  const primeCostPercent = ((estimatedFoodCost + estimatedLaborCost) / a.revenue) * 100 || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl mb-1">Service Overview</h1>
        <p className="font-serif italic text-charcoal/60">Live snapshot of tonight's service.</p>
      </div>
      
      <div className="bg-bone-dark/20 border hairline p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="uppercase-label text-charcoal/60">Food Cost (COGS)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-serif text-3xl">{formatMoney(estimatedFoodCost)}</span>
            <span className="text-sm text-green-700 font-medium">~28%</span>
          </div>
        </div>
        <div>
          <p className="uppercase-label text-charcoal/60">Labor Cost</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-serif text-3xl">{formatMoney(estimatedLaborCost)}</span>
            <span className="text-sm text-green-700 font-medium">~22%</span>
          </div>
        </div>
        <div>
          <p className="uppercase-label text-charcoal/60">Prime Cost Health</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`font-serif text-3xl ${primeCostPercent > 60 ? 'text-ember' : ''}`}>
              {primeCostPercent.toFixed(1)}%
            </span>
            <span className="text-sm text-charcoal/50">Target: &lt;60%</span>
          </div>
          <div className="w-full bg-bone-dark/50 h-1.5 mt-2 rounded-full overflow-hidden">
             <div className={`h-full ${primeCostPercent > 60 ? 'bg-ember' : 'bg-charcoal'}`} style={{ width: `${Math.min(primeCostPercent, 100)}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Revenue" value={formatMoney(a.revenue)} />
        <Stat label="Orders" value={a.totalOrders} />
        <Stat label="Active sessions" value={a.activeSessions} />
        <Stat label="Tables in service" value={`${a.occupied} / ${a.totalTables}`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Pending" value={a.byStatus.pending} />
        <Stat label="Cooking" value={a.byStatus.preparing} />
        <Stat label="Ready" value={a.byStatus.ready} />
        <Stat label="Served" value={a.byStatus.served} />
      </div>
      <div>
        <h2 className="font-serif text-2xl mb-3">Recent sessions</h2>
        <div className="bg-bone border hairline divide-y divide-[var(--border)]">
          {sessions.slice(0, 8).map((s) => (
            <div key={s.id} className="px-4 py-3 flex justify-between text-sm">
              <span className="font-mono">
                {s.id.slice(-6)} · {s.tableId}
              </span>
              <span className="uppercase-label text-charcoal/60">
                {s.mode} · {s.status}
              </span>
              <span className="text-charcoal/50">{new Date(s.openedAt).toLocaleTimeString()}</span>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="px-4 py-6 text-charcoal/50 italic font-serif">No sessions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuAdmin({ items, onChange }: { items: MenuItem[]; onChange: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    category: "Mains",
    image: "dish-beetroot",
    tag: "",
  });
  
  // Track inline edits for enterprise fast-updating
  const [editingPrice, setEditingPrice] = useState<Record<string, number>>({});

  const submit = async () => {
    if (!form.name) return;
    const r = await apiFetch("/api/admin", {
      method: "POST",
      body: JSON.stringify({
        resource: "menu",
        action: "create",
        payload: { ...form, tag: form.tag || undefined },
      }),
    });
    if (r.ok) {
      setForm({ ...form, name: "", description: "", price: 0, tag: "" });
      onChange();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this dish?")) return;
    await apiFetch("/api/admin", {
      method: "POST",
      body: JSON.stringify({ resource: "menu", action: "delete", payload: { id } }),
    });
    onChange();
  };

  const updatePrice = async (id: string, newPrice: number) => {
    await apiFetch("/api/admin", {
      method: "POST",
      body: JSON.stringify({
        resource: "menu",
        action: "update",
        payload: { id, price: newPrice },
      }),
    });
    onChange();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl mb-1">Menu</h1>
        <p className="font-serif italic text-charcoal/60">Add, edit, or retire dishes.</p>
      </div>

      <div className="bg-bone border hairline p-5 grid grid-cols-1 md:grid-cols-6 gap-3">
        <input
          className="md:col-span-2 px-3 py-2 border hairline bg-bone-dark/30"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="md:col-span-2 px-3 py-2 border hairline bg-bone-dark/30"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          className="px-3 py-2 border hairline bg-bone-dark/30 tabular-nums"
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
        />
        <select
          className="px-3 py-2 border hairline bg-bone-dark/30"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          <option>Openers</option>
          <option>Mains</option>
          <option>Desserts</option>
        </select>
        <input
          className="md:col-span-2 px-3 py-2 border hairline bg-bone-dark/30"
          placeholder="Image key (e.g. dish-burrata)"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
        />
        <input
          className="md:col-span-2 px-3 py-2 border hairline bg-bone-dark/30"
          placeholder="Tag (optional)"
          value={form.tag}
          onChange={(e) => setForm({ ...form, tag: e.target.value })}
        />
        <button
          onClick={submit}
          className="md:col-span-2 px-4 py-2 bg-charcoal text-bone uppercase-label"
        >
          Add Dish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => (
          <div key={m.id} className="bg-bone border hairline p-4 flex gap-3 group relative">
            <img src={dishImage(m.image)} alt={m.name} className="size-20 object-cover" />
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-serif text-lg truncate">{m.name}</h3>
                  <div className="flex items-center gap-1 bg-white border hairline px-1">
                    <span className="text-charcoal/50 text-sm">₹</span>
                    {/* ENTERPRISE LOGIC: Inline price editing */}
                    <input 
                      type="number" 
                      className="w-14 bg-transparent outline-none tabular-nums text-sm font-medium py-1"
                      value={editingPrice[m.id] ?? m.price}
                      onChange={(e) => setEditingPrice({ ...editingPrice, [m.id]: Number(e.target.value) })}
                      onBlur={() => {
                        const newPrice = editingPrice[m.id];
                        if (newPrice !== undefined && newPrice !== m.price) {
                           updatePrice(m.id, newPrice);
                        }
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-charcoal/60 line-clamp-2 mt-1">{m.description}</p>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <span className="uppercase-label text-charcoal/50">{m.category}</span>
                <button
                  onClick={() => remove(m.id)}
                  className="uppercase-label text-ember hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffAdmin({ items, onChange, selfId }: { items: StaffRow[]; onChange: () => void; selfId: string }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "WAITER" as "WAITER" | "KITCHEN" | "ADMIN",
  });
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const r = await apiFetch("/api/admin", {
      method: "POST",
      body: JSON.stringify({ resource: "staff", action: "create", payload: form }),
    });
    if (!r.ok) {
      setError(await r.text());
      return;
    }
    setForm({ name: "", email: "", password: "", role: "WAITER" });
    onChange();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    await apiFetch("/api/admin", {
      method: "POST",
      body: JSON.stringify({ resource: "staff", action: "delete", payload: { id } }),
    });
    onChange();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl mb-1">Staff</h1>
        <p className="font-serif italic text-charcoal/60">Manage waiters, kitchen, and admins.</p>
      </div>

      <div className="bg-bone border hairline p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          className="px-3 py-2 border hairline bg-bone-dark/30"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="px-3 py-2 border hairline bg-bone-dark/30"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="px-3 py-2 border hairline bg-bone-dark/30"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <select
          className="px-3 py-2 border hairline bg-bone-dark/30"
          value={form.role}
          onChange={(e) =>
            setForm({
              ...form,
              role: e.target.value as "WAITER" | "KITCHEN" | "ADMIN",
            })
          }
        >
          <option value="WAITER">Waiter</option>
          <option value="KITCHEN">Kitchen</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button onClick={submit} className="px-4 py-2 bg-charcoal text-bone uppercase-label">
          Add Staff
        </button>
        {error && <p className="md:col-span-5 text-sm text-ember">{error}</p>}
      </div>

      <div className="bg-bone border hairline divide-y divide-border">
        {items.map((u) => (
          <div key={u.id} className="px-4 py-3 flex justify-between items-center">
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-sm text-charcoal/60">{u.email}</p>
            </div>
            <span className="uppercase-label text-charcoal/60">{u.role}</span>
            {u.id !== selfId ? (
              <button
                onClick={() => remove(u.id)}
                className="uppercase-label text-ember hover:underline"
              >
                Remove
              </button>
            ) : (
              <span className="uppercase-label text-charcoal/40">You</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TablesAdmin({ items, onChange }: { items: Table[]; onChange: () => void }) {
  const [form, setForm] = useState({ label: "", capacity: 2, zone: "Main Floor" });
  
  const submit = async () => {
    if (!form.label) return;
    await apiFetch("/api/admin", {
      method: "POST",
      body: JSON.stringify({ resource: "tables", action: "create", payload: form }),
    });
    setForm({ label: "", capacity: 2, zone: "Main Floor" });
    onChange();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this table from the floor plan?")) return;
    const r = await apiFetch("/api/admin", {
      method: "POST",
      body: JSON.stringify({ resource: "tables", action: "delete", payload: { id } }),
    });
    if (!r.ok) alert(await r.text());
    onChange();
  };

  // ENTERPRISE LOGIC: Force a table to become available if system gets stuck
  const freeTable = async (id: string) => {
    if (!confirm("Force clear this table? This will mark it as available immediately.")) return;
    const r = await apiFetch("/api/admin", {
      method: "POST",
      body: JSON.stringify({ resource: "tables", action: "update", payload: { id, status: "available" } }),
    });
    if (!r.ok) alert(await r.text());
    onChange();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl mb-1">Tables</h1>
        <p className="font-serif italic text-charcoal/60">Manage the floor plan and clear blocked tables.</p>
      </div>
      <div className="bg-bone border hairline p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="px-3 py-2 border hairline bg-bone-dark/30"
          placeholder="Label (e.g. 06)"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
        <input
          className="px-3 py-2 border hairline bg-bone-dark/30 tabular-nums"
          type="number"
          placeholder="Capacity"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
        />
        <input
          className="px-3 py-2 border hairline bg-bone-dark/30"
          placeholder="Zone"
          value={form.zone}
          onChange={(e) => setForm({ ...form, zone: e.target.value })}
        />
        <button onClick={submit} className="px-4 py-2 bg-charcoal text-bone uppercase-label">
          Add Table
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((t) => (
          <div key={t.id} className="bg-bone border hairline p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-baseline">
                <span className="font-serif text-3xl italic">{t.label}</span>
                <span className={`uppercase-label ${t.status === 'available' ? 'text-moss' : 'text-ember'}`}>{t.status}</span>
              </div>
              <p className="text-sm text-charcoal/60 mt-2">
                {t.zone} · {t.capacity} seats
              </p>
            </div>
            <div className="mt-6 flex justify-between items-center border-t hairline pt-3">
              <button
                onClick={() => remove(t.id)}
                className="uppercase-label text-xs text-charcoal/50 hover:text-ember hover:underline"
              >
                Delete
              </button>
              {t.status !== "available" && (
                <button
                  onClick={() => freeTable(t.id)}
                  className="uppercase-label text-xs text-charcoal font-medium hover:underline border hairline px-2 py-1 bg-white"
                >
                  Free Table
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersView({ items, onChange }: { items: Order[]; onChange: () => void }) {
  // ENTERPRISE LOGIC: Admins can void active/stuck orders
  const cancelOrder = async (id: string) => {
    if (!confirm("DANGER: Force void this order? This action cannot be undone.")) return;
    await apiFetch("/api/admin", {
      method: "POST",
      body: JSON.stringify({ resource: "orders", action: "delete", payload: { id } }),
    });
    onChange();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl mb-1">Live Order Management</h1>
        <p className="font-serif italic text-charcoal/60">View history and void rogue tickets.</p>
      </div>
      <div className="bg-bone border hairline divide-y divide-[var(--border)]">
        {items.map((o) => (
          <div key={o.id} className="px-4 py-3 group">
            <div className="flex justify-between items-center uppercase-label text-charcoal/50">
              <div className="flex gap-4">
                <span className="text-charcoal font-bold">#{o.id.slice(-5)}</span>
                <span>Table {o.tableId}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-0.5 rounded ${o.status === 'served' ? 'bg-moss/10 text-moss' : 'bg-bone-dark text-charcoal'}`}>
                  {o.status}
                </span>
                <span>{new Date(o.createdAt).toLocaleTimeString()}</span>
                <button 
                  onClick={() => cancelOrder(o.id)}
                  className="text-ember uppercase-label text-xs border border-ember/30 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Void
                </button>
              </div>
            </div>
            <ul className="text-sm mt-2 bg-white/50 p-2 rounded">
              {o.items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    <span className="font-mono text-charcoal/60">{it.quantity}×</span> {it.name}
                  </span>
                  <span className="tabular-nums text-charcoal/60">
                    {formatMoney(it.price * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-4 py-6 italic font-serif text-charcoal/50">No orders yet.</p>
        )}
      </div>
    </div>
  );
}

type MockInventoryItem = { id: string; name: string; unit: string; currentStock: number; minimumStockLevel: number; };

function InventoryAdmin() {
  const [items, setItems] = useState<MockInventoryItem[]>([
    { id: "1", name: "Pizza Dough", unit: "grams", currentStock: 5000, minimumStockLevel: 2000 },
    { id: "2", name: "Mozzarella Cheese", unit: "grams", currentStock: 1200, minimumStockLevel: 3000 },
    { id: "3", name: "Tomato Sauce", unit: "ml", currentStock: 8000, minimumStockLevel: 5000 },
    { id: "4", name: "Burger Buns", unit: "pieces", currentStock: 45, minimumStockLevel: 50 },
  ]);
  
  const [form, setForm] = useState({ name: "", unit: "grams", currentStock: 0, minimumStockLevel: 0 });

  const submit = () => {
    if (!form.name) return;
    setItems([...items, { id: Math.random().toString(), ...form }]);
    setForm({ name: "", unit: "grams", currentStock: 0, minimumStockLevel: 0 });
  };

  const remove = (id: string) => {
    if (!confirm("Remove this raw material?")) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateStock = (id: string, newStock: number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, currentStock: newStock } : i)));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl mb-1">Inventory & Yield</h1>
        <p className="font-serif italic text-charcoal/60">Manage raw materials and track low-stock alerts.</p>
      </div>

      <div className="bg-bone border hairline p-5 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className="px-3 py-2 border hairline bg-bone-dark/30" placeholder="Material Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="px-3 py-2 border hairline bg-bone-dark/30" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
          <option value="grams">Grams (g)</option>
          <option value="ml">Milliliters (ml)</option>
          <option value="pieces">Pieces</option>
        </select>
        <input className="px-3 py-2 border hairline bg-bone-dark/30 tabular-nums" type="number" placeholder="Current Stock" value={form.currentStock || ""} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} />
        <input className="px-3 py-2 border hairline bg-bone-dark/30 tabular-nums" type="number" placeholder="Min Alert Level" value={form.minimumStockLevel || ""} onChange={(e) => setForm({ ...form, minimumStockLevel: Number(e.target.value) })} />
        <button onClick={submit} className="px-4 py-2 bg-charcoal text-bone uppercase-label">Add Stock</button>
      </div>

      <div className="bg-bone border hairline divide-y divide-[var(--border)]">
        <div className="px-4 py-3 flex justify-between uppercase-label text-charcoal/50 text-sm bg-bone-dark/10">
          <div className="w-1/3">Raw Material</div>
          <div className="w-1/4 text-center">Stock Remaining</div>
          <div className="w-1/4 text-center">Alert Threshold</div>
          <div className="w-1/12 text-right">Action</div>
        </div>
        {items.map((i) => {
          const isLowStock = i.currentStock <= i.minimumStockLevel;
          return (
            <div key={i.id} className={`px-4 py-3 flex justify-between items-center transition-colors ${isLowStock ? "bg-ember/5" : ""}`}>
              <div className="w-1/3 font-medium flex items-center gap-2">
                {i.name}
                {isLowStock && <span className="px-2 py-0.5 bg-ember text-bone text-xs uppercase-label rounded-sm">Low</span>}
              </div>
              <div className="w-1/4 text-center flex justify-center items-center gap-2">
                <input type="number" className={`w-24 px-2 py-1 border hairline bg-bone tabular-nums text-center focus:outline-none ${isLowStock ? "border-ember/50 text-ember" : ""}`} value={i.currentStock} onChange={(e) => updateStock(i.id, Number(e.target.value))} />
                <span className="text-sm text-charcoal/60 w-12 text-left">{i.unit}</span>
              </div>
              <div className="w-1/4 text-center tabular-nums text-charcoal/60">{i.minimumStockLevel} {i.unit}</div>
              <div className="w-1/12 text-right">
                <button onClick={() => remove(i.id)} className="uppercase-label text-ember hover:underline text-sm">Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type MockPayroll = { id: string; name: string; role: string; payType: "HOURLY" | "SALARY"; baseRate: number; hoursLogged: number; overtimeHours: number; deductions: number; status: "PENDING" | "PAID"; };

function PayrollAdmin() {
  const [payroll, setPayroll] = useState<MockPayroll[]>([
    { id: "1", name: "Rahul Sharma", role: "Head Chef", payType: "SALARY", baseRate: 45000, hoursLogged: 160, overtimeHours: 0, deductions: 1500, status: "PAID" },
    { id: "2", name: "Priya Desai", role: "Waiter", payType: "HOURLY", baseRate: 150, hoursLogged: 180, overtimeHours: 12, deductions: 0, status: "PENDING" },
    { id: "3", name: "Amit Kumar", role: "Kitchen Helper", payType: "HOURLY", baseRate: 100, hoursLogged: 160, overtimeHours: 5, deductions: 500, status: "PENDING" },
  ]);

  const calculateNetPay = (staff: MockPayroll) => {
    let gross = staff.payType === "SALARY" ? staff.baseRate : (staff.baseRate * staff.hoursLogged) + (staff.baseRate * 1.5 * staff.overtimeHours);
    return gross - staff.deductions;
  };

  const markAsPaid = (id: string) => {
    if(!confirm("Confirm releasing payment for this employee?")) return;
    setPayroll(payroll.map(p => p.id === id ? { ...p, status: "PAID" } : p));
  };

  const runMasterPayroll = () => {
    if(!confirm("This will process payments for all PENDING staff. Proceed?")) return;
    setPayroll(payroll.map(p => ({ ...p, status: "PAID" })));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-serif text-4xl mb-1">Payroll & HR</h1>
          <p className="font-serif italic text-charcoal/60">Manage wages, overtime, and salary payouts.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border hairline uppercase-label hover:bg-bone-dark/20">Export CSV</button>
          <button onClick={runMasterPayroll} className="px-4 py-2 bg-charcoal text-bone uppercase-label">Run Payroll</button>
        </div>
      </div>

      <div className="bg-bone border hairline overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b hairline bg-bone-dark/10 uppercase-label text-xs text-charcoal/60">
              <th className="p-4 font-normal">Employee</th>
              <th className="p-4 font-normal">Type & Rate</th>
              <th className="p-4 font-normal text-center">Hours / OT</th>
              <th className="p-4 font-normal text-right">Deductions</th>
              <th className="p-4 font-normal text-right">Net Pay</th>
              <th className="p-4 font-normal text-center">Status</th>
              <th className="p-4 font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {payroll.map(p => {
              const netPay = calculateNetPay(p);
              return (
                <tr key={p.id} className="hover:bg-bone-dark/5 transition-colors">
                  <td className="p-4">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-charcoal/60">{p.role}</div>
                  </td>
                  <td className="p-4">
                    <div>{p.payType}</div>
                    <div className="text-sm text-charcoal/60 tabular-nums">{p.payType === "HOURLY" ? `${formatMoney(p.baseRate)}/hr` : `${formatMoney(p.baseRate)}/mo`}</div>
                  </td>
                  <td className="p-4 text-center tabular-nums">
                    {p.hoursLogged}h
                    {p.overtimeHours > 0 && <span className="text-ember block text-sm">+{p.overtimeHours}h OT</span>}
                  </td>
                  <td className="p-4 text-right tabular-nums text-ember">{p.deductions > 0 ? `-${formatMoney(p.deductions)}` : "—"}</td>
                  <td className="p-4 text-right font-serif font-medium tabular-nums text-lg">{formatMoney(netPay)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 text-xs uppercase-label rounded-sm ${p.status === 'PAID' ? 'bg-green-700/10 text-green-800' : 'bg-ember/10 text-ember'}`}>{p.status}</span>
                  </td>
                  <td className="p-4 text-right">
                    {p.status === "PENDING" ? (
                      <button onClick={() => markAsPaid(p.id)} className="uppercase-label text-sm text-charcoal hover:underline">Pay Now</button>
                    ) : (
                      <span className="uppercase-label text-sm text-charcoal/40">Settled</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}