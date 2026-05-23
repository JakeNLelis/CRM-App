import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await register(email, password, name);
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Could not create account");
    } else {
      navigate("/app/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 grid md:grid-cols-2" data-testid="register-page">
      <div className="hidden md:flex relative bg-slate-900 text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 dotted-grid opacity-10" />
        <Link to="/" className="relative z-10 flex items-center gap-2.5 text-white">
          <span className="logo-mark" style={{ background: "white", color: "#0f172a" }}>F</span>
          <span className="font-display font-semibold tracking-tight">FlowCRM</span>
        </Link>
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-4">2-minute setup</p>
          <h1 className="text-4xl md:text-5xl font-display font-light tracking-tighter leading-tight">
            Your CRM,<br />
            ready before<br />
            <span className="text-slate-500">your coffee.</span>
          </h1>
          <ul className="mt-12 space-y-4 text-sm text-slate-300">
            <li className="flex gap-3"><span className="text-emerald-400">✓</span> Pre-seeded with realistic demo data</li>
            <li className="flex gap-3"><span className="text-emerald-400">✓</span> Drag-and-drop pipelines from minute one</li>
            <li className="flex gap-3"><span className="text-emerald-400">✓</span> Visual when-then automation builder</li>
          </ul>
        </div>
        <p className="relative z-10 text-xs text-slate-500">© 2026 FlowCRM</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="md:hidden flex items-center gap-2.5 mb-10">
            <span className="logo-mark">F</span>
            <span className="font-display font-semibold tracking-tight">FlowCRM</span>
          </Link>
          <Link to="/" className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-10">
            <ArrowLeft className="w-3.5 h-3.5" /> Back home
          </Link>
          <h2 className="text-3xl font-display font-medium tracking-tight text-slate-900">Create account</h2>
          <p className="text-sm text-slate-500 mt-2">Spin up your CRM workspace in seconds.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" data-testid="register-form">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  className="inp pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="register-name-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  className="inp pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  data-testid="register-email-input"
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
                  minLength={6}
                  autoComplete="new-password"
                  data-testid="register-password-input"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Minimum 6 characters.</p>
            </div>
            {error && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2" data-testid="register-error">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5" data-testid="register-submit">
              {loading ? "Creating…" : <>Create account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="text-slate-900 font-medium hover:underline" data-testid="register-go-login">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
