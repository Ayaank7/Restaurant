import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setStaffSession, getStaffUser, clearStaffSession } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In — Maison d'Ordre" }] }),
  component: LoginPage,
});

const DEMO = [
  { role: "Admin", email: "admin@maison.test", password: "admin123" },
  { role: "Waiter", email: "waiter@maison.test", password: "waiter123" },
  { role: "Kitchen", email: "kitchen@maison.test", password: "kitchen123" },
];

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getStaffUser();
    if (u) routeFor(u.role, navigate);
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const j = (await res.json()) as { token: string; user: { id: string; name: string; role: "ADMIN" | "WAITER" | "KITCHEN" } };
      setStaffSession(j.token, { ...j.user, email });
      router.invalidate();
      routeFor(j.user.role, navigate);
    } finally {
      setLoading(false);
    }
  };

  const fill = (d: typeof DEMO[number]) => {
    setEmail(d.email); setPassword(d.password);
  };

  return (
    <div className="texture-linen min-h-screen flex items-center justify-center px-5 py-10 text-charcoal">
      <div className="w-full max-w-md bg-bone border hairline p-8 md:p-10 shadow-sm">
        <div className="flex justify-between items-baseline mb-8">
          <Link to="/" className="font-serif italic text-2xl">Maison d'Ordre</Link>
          <span className="uppercase-label text-charcoal/50">Staff</span>
        </div>
        <p className="uppercase-label text-ember mb-3">Sign In</p>
        <h1 className="font-serif text-4xl leading-tight mb-2">Welcome back.</h1>
        <p className="font-serif italic text-charcoal/60 mb-8">
          Sign in to access your station.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="uppercase-label text-charcoal/50 block mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bone-dark/40 border hairline px-4 py-3 focus:outline-none focus:border-charcoal"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="uppercase-label text-charcoal/50 block mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bone-dark/40 border hairline px-4 py-3 focus:outline-none focus:border-charcoal"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-ember">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-charcoal text-bone uppercase-label hover:bg-ink transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t hairline">
          <p className="uppercase-label text-charcoal/50 mb-3">Demo accounts</p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO.map((d) => (
              <button
                key={d.role}
                type="button"
                onClick={() => fill(d)}
                className="text-xs border hairline px-2 py-2 hover:bg-bone-dark/40 transition-colors"
              >
                <span className="block font-medium">{d.role}</span>
                <span className="block text-charcoal/50 truncate">{d.email}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { clearStaffSession(); }}
            className="uppercase-label text-charcoal/40 hover:text-charcoal"
          >
            Reset session
          </button>
        </div>
      </div>
    </div>
  );
}

function routeFor(role: string, navigate: ReturnType<typeof useNavigate>) {
  if (role === "ADMIN") navigate({ to: "/admin" });
  else if (role === "WAITER") navigate({ to: "/waiter" });
  else if (role === "KITCHEN") navigate({ to: "/kitchen" });
}
