/**
 * Landing page — professional SaaS entry point with hero section and feature grid.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#f8fafc] to-slate-50">
      {/* Navbar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-sm backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white/30">
              D
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">DroneGrid</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">Beta</span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <a href="/login" className="text-slate-600 hover:text-indigo-600 transition-colors">Log in</a>
            <a href="/register" className="text-slate-600 hover:text-indigo-600 transition-colors">Register</a>
            <a href="/login" className="btn btn-primary text-xs">Get Started →</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -top-40 -left-16 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-72 w-96 rounded-full bg-emerald-300/30 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/30 backdrop-blur-sm">
                🚀 Autonomous Drone Logistics
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                Urban Drone Delivery<br />
                <span className="text-indigo-600">Grid Management</span>
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed max-w-lg">
                A polyglot-persistence DBMS for Bengaluru's 3 km drone delivery grid.
                PostgreSQL for ACID orders &amp; billing, MongoDB for high-frequency telemetry.
              </p>
              <div className="flex gap-4">
                <a href="/login" className="btn btn-primary">
                  Launch Dashboard
                  <span className="text-base">→</span>
                </a>
                <a href="#features" className="btn btn-secondary">
                  Features
                  <span className="text-base">→</span>
                </a>
              </div>
            </div>
            <div className="animate-slide-up relative">
              <div className="rounded-3xl border border-white/30 bg-white/10 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-2xl blur opacity-30" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'PostgreSQL ACID', mark: '✓', color: 'from-indigo-500 to-indigo-700' },
                    { label: 'MongoDB Time-Series', mark: '✓', color: 'from-emerald-500 to-emerald-700' },
                    { label: 'Role-Based Access', mark: '✓', color: 'from-amber-500 to-amber-700' },
                    { label: 'JWT Auth', mark: '✓', color: 'from-rose-500 to-rose-700' },
                    { label: 'Trigger Automation', mark: '✓', color: 'from-indigo-500 to-indigo-700' },
                    { label: '2dsphere Geo Index', mark: '✓', color: 'from-emerald-500 to-emerald-700' },
                    { label: 'Real-Time Telemetry', mark: '✓', color: 'from-amber-500 to-amber-700' },
                    { label: 'Docker Compose', mark: '✓', color: 'from-rose-500 to-rose-700' },
                  ].map((f) => (
                    <div key={f.label} className="space-y-2">
                      <div className={`flex items-center gap-2 ${f.color}`}>
                        <span className="text-xs font-bold">{f.mark}</span>
                        <span className="text-brand-100 font-medium">{f.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Everything you need</h2>
            <p className="text-slate-600 mt-4">Production-ready DBMS architecture</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'PostgreSQL Orders', desc: 'ACID-compliant order lifecycle with PL/pgSQL transactions, drone assignment, payment capture, and invoice generation.', icon: '📦', cta: 'Learn More', ctaHref: '#orders' },
              { title: 'MongoDB Telemetry', desc: 'Time-series collections with TTL expiration, 2dsphere geospatial indexes, and $facet aggregations for fleet analytics.', icon: '🛰️', cta: 'Watch Demo', ctaHref: '#telemetry' },
              { title: 'Trigger Automation', desc: 'Battery-low drones auto-flip to Maintenance, last_seen_at syncs on every telemetry update, monotonic maintenance resolution.', icon: '⚡', cta: 'See Code', ctaHref: '#triggers' },
              { title: 'Role-Based Access', desc: 'RBAC enforced at middleware boundary and inside every handler. Customers see only their own orders; admins control the whole grid.', icon: '🔐', cta: 'Security Demo', ctaHref: '#security' },
              { title: 'JWT Cookie Auth', desc: 'HttpOnly cookies with sameSite=lax — XSS-resistant session tokens, no localStorage exposure. Rate limiting on login.', icon: '🔑', cta: 'Try it', ctaHref: '#login' },
              { title: 'Audit Trail', desc: 'Append-only audit_log table captures login failures, order creations, and role violations for forensic review.', icon: '📋', cta: 'View Logs', ctaHref: '#audit' },
            ].map((f, i) => (
              <div key={i} className="card animate-fade-in" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center text-2xl shadow-sm mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">{f.desc}</p>
                <a href={f.ctaHref} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline">
                  {f.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-sm text-slate-500">
          <span>DroneGrid DBMS — PostgreSQL + MongoDB + Next.js</span>
          <span>Bengaluru 3 km Grid</span>
        </div>
      </footer>
    </div>
  );
}
