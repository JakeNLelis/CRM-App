import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Workflow,
  CircleDollarSign,
  Users,
  KanbanSquare,
  BarChart3,
  ListChecks,
  Shield,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  { icon: KanbanSquare, title: "Drag-and-drop pipelines", desc: "Move deals across stages with a click. List and Kanban views switch instantly." },
  { icon: Workflow, title: "When-then automations", desc: "Trigger follow-up tasks the moment a deal lands in Closed Won — or any rule you build." },
  { icon: BarChart3, title: "Revenue you can read", desc: "A dashboard that answers your three questions: pipeline, won, win-rate. Nothing else." },
  { icon: Users, title: "Companies & contacts", desc: "Every relationship in one place, with custom columns, filters, and CSV import/export." },
  { icon: ListChecks, title: "Activity that actually lands", desc: "Calls, meetings, and tasks linked to deals — never miss the next step." },
  { icon: Shield, title: "Your data, your shape", desc: "Filters, custom columns, and a clean schema you can grow with." },
];

const LOGOS = ["Northwind", "Pinecone", "Arcadia", "Mosaic", "Vertex", "Cobalt"];

export default function Landing() {
  return (
    <div className="bg-white text-slate-900 min-h-screen" data-testid="landing-page">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" data-testid="landing-logo">
            <span className="logo-mark">F</span>
            <span className="font-display font-semibold text-[15px] tracking-tight">FlowCRM</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-slate-900 transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost text-sm" data-testid="landing-login-link">Sign in</Link>
            <Link to="/register" className="btn-primary btn-sm" data-testid="landing-register-link">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 dotted-grid opacity-60" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-white via-white to-transparent" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 md:pt-28 pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 pill bg-white border-slate-200 text-slate-600 mb-7" data-testid="landing-eyebrow">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>The CRM that gets out of the way.</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-light tracking-tighter leading-[1.02] text-slate-900">
              Run your revenue,<br />
              <span className="text-slate-400">not your spreadsheet.</span>
            </h1>
            <p className="text-base md:text-lg text-slate-600 mt-7 max-w-xl leading-relaxed">
              FlowCRM is a no-nonsense CRM with pipelines, automations, and a dashboard you'll actually read.
              Built for revenue teams that move quickly and dislike clutter.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Link to="/register" className="btn-primary px-5 py-2.5" data-testid="hero-cta-register">
                Start free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="btn-secondary px-5 py-2.5" data-testid="hero-cta-login">
                Sign in
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-slate-500">
              <span>No credit card</span>
              <span>•</span>
              <span>Pre-seeded with demo data</span>
              <span>•</span>
              <span>2-minute setup</span>
            </div>
          </div>

          {/* Hero artwork */}
          <div className="relative mt-16 md:mt-24">
            <div className="card overflow-hidden shadow-ring">
              <div className="flex items-center gap-1.5 px-4 h-9 border-b border-slate-200 bg-slate-50">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
                <span className="text-[11px] text-slate-400 ml-3 font-mono">flowcrm.io / pipeline</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50/40">
                {[
                  { label: "New Lead", color: "bg-slate-200", count: 8, value: "$842k" },
                  { label: "Qualified", color: "bg-blue-200", count: 7, value: "$778k" },
                  { label: "Negotiation", color: "bg-violet-200", count: 3, value: "$402k" },
                  { label: "Closed Won", color: "bg-emerald-200", count: 11, value: "$1.2M" },
                ].map((col) => (
                  <div key={col.label} className="bg-white border border-slate-200 rounded-md p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.color}`} />
                        <span className="text-xs font-semibold text-slate-700">{col.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{col.count}</span>
                    </div>
                    <div className="space-y-2">
                      {[0, 1].map((i) => (
                        <div key={i} className="border border-slate-200 rounded p-2">
                          <div className="h-2 bg-slate-200 rounded w-3/4 mb-1.5" />
                          <div className="h-1.5 bg-slate-100 rounded w-1/2" />
                        </div>
                      ))}
                      <div className="text-[11px] text-slate-500 pt-1">{col.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating badge */}
            <div className="hidden md:flex absolute -bottom-6 -right-6 bg-slate-900 text-white rounded-lg px-4 py-3 shadow-ring items-center gap-3">
              <Workflow className="w-4 h-4 text-emerald-400" />
              <div className="text-xs">
                <div className="font-semibold">Rule fired</div>
                <div className="text-slate-300">+ Follow-up task created</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Built for teams at</p>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
            {LOGOS.map((l) => (
              <span key={l} className="font-display font-medium text-slate-400 tracking-tight text-lg">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Everything you actually use</p>
          <h2 className="text-4xl md:text-5xl font-display font-light tracking-tighter text-slate-900">
            Built around the moments<br /> that move revenue.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 mt-14 border border-slate-200 rounded-lg overflow-hidden">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white p-7 flex flex-col gap-3">
              <f.icon className="w-5 h-5 text-slate-900" />
              <h3 className="text-base font-display font-semibold text-slate-900 mt-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">When → then</p>
            <h2 className="text-4xl md:text-5xl font-display font-light tracking-tighter text-slate-900">
              Automate the boring,<br />
              <span className="text-slate-400">keep the wins.</span>
            </h2>
            <p className="text-slate-600 mt-6 leading-relaxed max-w-md">
              When a deal flips to Closed Won, send a thank-you task. When a new contact arrives, schedule an intro call.
              Build any rule with the visual builder — toggle them on and off in a click.
            </p>
            <Link to="/register" className="btn-primary mt-7 px-5 py-2.5 inline-flex" data-testid="workflow-cta">
              Try the builder <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="card p-5 shadow-ring">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">Rule preview</div>
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-md p-3 bg-white">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">When</div>
                <div className="text-sm font-medium text-slate-900">A deal moves to <span className="stage-chip bg-emerald-50 text-emerald-700 border-emerald-200 ml-1">Closed Won</span></div>
              </div>
              <div className="border-l-2 border-slate-300 h-3 ml-4" />
              <div className="border border-slate-200 rounded-md p-3 bg-white">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Then</div>
                <div className="text-sm font-medium text-slate-900">Create task <span className="font-normal text-slate-600">"Send thank-you & onboarding plan"</span> due in <span className="font-mono">1 day</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { v: "47%", l: "less time in spreadsheets" },
            { v: "3.2×", l: "faster pipeline reviews" },
            { v: "100%", l: "of your data, never locked in" },
          ].map((s) => (
            <div key={s.l} className="border-t border-slate-200 pt-8">
              <div className="text-6xl font-display font-light tracking-tighter text-slate-900">{s.v}</div>
              <div className="text-sm text-slate-600 mt-2">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing CTA */}
      <section id="pricing" className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-28 text-center">
          <h2 className="text-4xl md:text-6xl font-display font-light tracking-tighter">
            Start in two minutes.<br />
            <span className="text-slate-500">Cancel any time.</span>
          </h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="bg-white text-slate-900 hover:bg-slate-100 px-6 py-3 rounded-md text-sm font-semibold inline-flex items-center gap-2 fr-ring" data-testid="footer-cta-register">
              Create your workspace <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="border border-white/20 hover:bg-white/10 text-white px-6 py-3 rounded-md text-sm font-semibold inline-flex items-center gap-2 fr-ring" data-testid="footer-cta-login">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 border-t border-white/10 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="logo-mark" style={{ background: "#0f172a", border: "1px solid #1e293b" }}>F</span>
            <span className="font-display font-semibold">FlowCRM</span>
          </div>
          <div className="flex items-center gap-6">
            <span>© 2026 FlowCRM</span>
            <span>Built for revenue teams</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
