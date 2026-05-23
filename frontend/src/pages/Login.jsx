import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@flowcrm.io");
  const [password, setPassword] = useState("Admin@1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Invalid credentials");
    } else {
      navigate("/app/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 grid md:grid-cols-2" data-testid="login-page">
      {/* Left visual */}
      <div className="hidden md:flex relative bg-slate-900 text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 dotted-grid opacity-10" />
        <Link to="/" className="relative z-10 flex items-center gap-2.5 text-white" data-testid="login-back-home">
          <span className="logo-mark" style={{ background: "white", color: "#0f172a" }}>F</span>
          <span className="font-display font-semibold tracking-tight">FlowCRM</span>
        </Link>
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-4">Welcome back</p>
          <h1 className="text-4xl md:text-5xl font-display font-light tracking-tighter leading-tight">
            Pick up where<br /> your pipeline<br />
            <span className="text-slate-500">left off.</span>
          </h1>
          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { l: "Pipeline value", v: "$2.76M" },
              { l: "Win rate", v: "91.7%" },
              { l: "Active deals", v: "28" },
              { l: "This month", v: "+12 won" },
            ].map((s) => (
              <div key={s.l} className="border border-white/10 rounded-md p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{s.l}</div>
                <div className="text-2xl font-display font-medium mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-slate-500">© 2026 FlowCRM</p>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="md:hidden flex items-center gap-2.5 mb-10" data-testid="login-mobile-home">
            <span className="logo-mark">F</span>
            <span className="font-display font-semibold tracking-tight">FlowCRM</span>
          </Link>
          <Link to="/" className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-10">
            <ArrowLeft className="w-3.5 h-3.5" /> Back home
          </Link>
          <h2 className="text-3xl font-display font-medium tracking-tight text-slate-900">Sign in</h2>
          <p className="text-sm text-slate-500 mt-2">Use your FlowCRM workspace credentials.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" data-testid="login-form">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  className="inp pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  data-testid="login-email-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  className="inp pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  data-testid="login-password-input"
                />
              </div>
            </div>
            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2" data-testid="login-error">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5" data-testid="login-submit">
              {loading ? "Signing in…" : <>Sign in <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-500">
            New here?{" "}
            <Link to="/register" className="text-slate-900 font-medium hover:underline" data-testid="login-go-register">
              Create an account
            </Link>
          </div>

          <div className="mt-10 text-xs text-slate-400 border-t border-slate-200 pt-5">
            Demo credentials are pre-filled.<br />
            <span className="font-mono">admin@flowcrm.io</span> / <span className="font-mono">Admin@1234</span>
          </div>
        </div>
      </div>
    </div>
  );
}
