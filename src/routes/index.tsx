import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-restaurant.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="texture-linen min-h-screen text-charcoal">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 md:px-12 py-6 border-b hairline">
        <span className="font-serif italic text-2xl tracking-tight">Maison d'Ordre</span>
        <div className="hidden md:flex gap-8 uppercase-label text-charcoal/60">
          <a href="#chapters" className="hover:text-charcoal transition-colors">Chapters</a>
          <a href="#menu" className="hover:text-charcoal transition-colors">Demo</a>
        </div>
        <Link to="/login" className="uppercase-label text-charcoal hover:text-ember transition-colors">
          Staff Sign In →
        </Link>
      </header>

      {/* Hero */}
      <section className="relative grid md:grid-cols-12 gap-0">
        <div className="md:col-span-7 px-6 md:px-12 py-16 md:py-28 flex flex-col justify-center">
          <p className="uppercase-label text-ember mb-6">Restaurant Operating System</p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight">
            The quiet architecture <br />
            <span className="italic">behind a great service.</span>
          </h1>
          <p className="mt-8 max-w-xl text-charcoal/70 leading-relaxed">
            Four roles, one operating system. Guests order from the table, waiters run the floor,
            the kitchen fires every ticket, and admins see it all — each behind their own door.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/t/$tableId"
              params={{ tableId: "T1" }}
              className="px-7 py-4 bg-charcoal text-bone uppercase-label hover:bg-ink transition-colors"
            >
              Try Guest View — Table 01
            </Link>
            <Link
              to="/login"
              className="px-7 py-4 border border-charcoal uppercase-label hover:bg-charcoal hover:text-bone transition-colors"
            >
              Staff Sign In
            </Link>
          </div>
          <p className="mt-6 text-xs text-charcoal/50">
            Demo logins · admin@maison.test / admin123 · waiter@maison.test / waiter123 · kitchen@maison.test / kitchen123
          </p>
        </div>
        <div className="md:col-span-5 relative min-h-[320px] md:min-h-0">
          <img
            src={heroImg}
            alt="Dimly lit dining room at dusk"
            width={1600}
            height={900}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-charcoal/10" />
        </div>
      </section>

      {/* Chapters */}
      <section id="chapters" className="px-6 md:px-12 py-20 border-t hairline">
        <p className="uppercase-label text-charcoal/50 mb-10">Three rooms · One system</p>
        <div className="grid md:grid-cols-3 gap-px bg-charcoal/10">
          {[
            {
              n: "I",
              title: "The Guest",
              desc: "Scan a code at the table. Browse the menu, place orders, watch the kitchen work, settle the bill.",
              to: "/t/$tableId" as const,
              params: { tableId: "T1" },
              cta: "Sit at Table 01",
            },
            {
              n: "II",
              title: "The Floor",
              desc: "A live map of the dining room. Open sessions, take orders, answer calls, manage covers.",
              to: "/waiter" as const,
              cta: "Enter the Floor",
            },
            {
              n: "III",
              title: "The Kitchen",
              desc: "New orders appear instantly. Tap to start cooking, mark ready, then served — one tap each step.",
              to: "/kitchen" as const,
              cta: "Open the Kitchen",
            },
          ].map((c) => (
            <div key={c.n} className="bg-bone p-10 md:p-12 flex flex-col">
              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-serif italic text-4xl text-ember">{c.n}</span>
                <h3 className="font-serif text-3xl">{c.title}</h3>
              </div>
              <p className="text-charcoal/70 leading-relaxed flex-1">{c.desc}</p>
              {c.params ? (
                <Link
                  to={c.to}
                  params={c.params}
                  className="mt-8 uppercase-label inline-flex items-center gap-2 text-charcoal hover:text-ember transition-colors"
                >
                  {c.cta} →
                </Link>
              ) : (
                <Link
                  to={c.to}
                  className="mt-8 uppercase-label inline-flex items-center gap-2 text-charcoal hover:text-ember transition-colors"
                >
                  {c.cta} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 md:px-12 py-8 border-t hairline flex flex-col md:flex-row justify-between gap-3 text-charcoal/50 uppercase-label">
        <span>Maison d'Ordre — Demo</span>
        <span>Real-time · In-memory · Built for live service</span>
      </footer>
    </div>
  );
}
