import React, { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Briefcase, CheckCircle2, AlertCircle, Building2, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";
import { http } from "../lib/api";
import { useData } from "../context/DataContext";
import { formatCurrency, formatCurrencyFull, stageById, STAGES, relativeDate, initials } from "../lib/utils";
import PageHeader from "../components/app/PageHeader";
import { StatusPill } from "../components/app/StatusPill";

export default function Dashboard() {
  const { activities, lookups, users } = useData();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    http.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  if (!stats) {
    return <div className="p-8 text-slate-500 text-sm" data-testid="dashboard-loading">Loading dashboard…</div>;
  }

  // Build chart data — stages in order
  const stageData = STAGES.map((s) => {
    const v = stats.by_stage?.[s.id]?.value || 0;
    const c = stats.by_stage?.[s.id]?.count || 0;
    return { name: s.name, value: Math.round(v), count: c, fill: getStageFill(s.id) };
  });

  // Revenue by month — last 6 months
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    months.push({ month: label, key, value: Math.round(stats.revenue_by_month?.[key] || 0) });
  }

  const upcoming = (activities || [])
    .filter((a) => a.status === "pending")
    .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0))
    .slice(0, 6);

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        title="Dashboard"
        description="Pipeline health, revenue progression, and what needs your attention today."
        testid="dashboard-header"
      />

      <div className="px-6 md:px-8 pb-12 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Pipeline value"
            value={formatCurrencyFull(stats.total_pipeline_value)}
            delta="+8.4% MoM"
            positive
            icon={Briefcase}
            testid="kpi-pipeline"
          />
          <KpiCard
            label="Won this period"
            value={formatCurrencyFull(stats.won_value)}
            delta={`${stats.won_count} deals`}
            positive
            icon={CheckCircle2}
            testid="kpi-won"
          />
          <KpiCard
            label="Open deals"
            value={stats.open_deals}
            delta={`${stats.upcoming_activities} upcoming activities`}
            icon={TrendingUp}
            testid="kpi-open"
          />
          <KpiCard
            label="Win rate"
            value={`${stats.win_rate}%`}
            delta={`${stats.lost_count} lost`}
            positive={stats.win_rate >= 50}
            icon={ArrowUpRight}
            testid="kpi-winrate"
          />
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2" data-testid="card-pipeline-chart">
            <div className="card-header">
              <div>
                <h3 className="card-title">Deal value by stage</h3>
                <p className="text-xs text-slate-500 mt-0.5">Open + closed pipeline distribution</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">USD</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stageData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} angle={-12} dy={10} height={50} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                    formatter={(v) => formatCurrencyFull(v)}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" data-testid="card-revenue-trend">
            <div className="card-header">
              <h3 className="card-title">Revenue trend</h3>
              <span className="text-xs text-slate-500">6 months</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={months} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(v) => formatCurrencyFull(v)} />
                  <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={{ r: 3, fill: "#0f172a" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Funnel + upcoming */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2" data-testid="card-funnel">
            <div className="card-header">
              <h3 className="card-title">Pipeline funnel</h3>
              <span className="text-xs text-slate-500">Counts by stage</span>
            </div>
            <div className="card-body space-y-3">
              {STAGES.map((s) => {
                const count = stats.by_stage?.[s.id]?.count || 0;
                const value = stats.by_stage?.[s.id]?.value || 0;
                const maxCount = Math.max(...Object.values(stats.by_stage || {}).map((v) => v.count || 0), 1);
                const pct = (count / maxCount) * 100;
                return (
                  <div key={s.id} className="flex items-center gap-4">
                    <div className="w-28 text-xs font-medium text-slate-700">{s.name}</div>
                    <div className="flex-1 h-7 bg-slate-50 rounded-md relative border border-slate-200 overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, background: getStageFill(s.id) }}
                      />
                    </div>
                    <div className="w-24 text-right text-xs">
                      <span className="font-semibold text-slate-900">{count}</span>
                      <span className="text-slate-400"> · {formatCurrency(value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" data-testid="card-upcoming">
            <div className="card-header">
              <h3 className="card-title">Upcoming activities</h3>
              <span className="text-xs text-slate-500">{stats.overdue_activities} overdue</span>
            </div>
            <div className="card-body space-y-3">
              {upcoming.length === 0 && (
                <p className="text-sm text-slate-500">Nothing pending. </p>
              )}
              {upcoming.map((a) => {
                const owner = lookups.userById[a.owner_id];
                const isOverdue = a.due_date && new Date(a.due_date) < new Date();
                return (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-md border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
                    <span
                      className="avatar shrink-0"
                      style={{ background: owner?.avatar_color || "#0f172a", width: 28, height: 28 }}
                    >
                      {initials(owner?.name || "?")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{a.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="capitalize">{a.type}</span>
                        <span>·</span>
                        <span className={isOverdue ? "text-rose-700 font-medium" : ""}>{relativeDate(a.due_date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer band */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FooterStat label="Companies" value={stats.total_companies} icon={Building2} />
          <FooterStat label="Contacts" value={stats.total_contacts} icon={Users} />
          <FooterStat label="Team members" value={users.length} icon={Users} />
          <FooterStat label="Overdue activities" value={stats.overdue_activities} icon={AlertCircle} tone="text-rose-700" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, delta, positive, icon: Icon, testid }) {
  return (
    <div className="kpi" data-testid={testid}>
      <div className="flex items-center justify-between">
        <span className="kpi-label">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      </div>
      <div className="kpi-value">{value}</div>
      {delta && (
        <div className={positive ? "kpi-delta-pos" : "kpi-delta-neg"}>
          <span className="inline-flex items-center gap-1">
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {delta}
          </span>
        </div>
      )}
    </div>
  );
}

function FooterStat({ label, value, icon: Icon, tone = "" }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
        <Icon className={`w-4 h-4 ${tone || "text-slate-500"}`} />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-base font-display font-semibold">{value}</div>
      </div>
    </div>
  );
}

function getStageFill(stage) {
  return {
    new_lead: "#cbd5e1",
    qualified: "#60a5fa",
    proposal: "#fbbf24",
    negotiation: "#a78bfa",
    closed_won: "#34d399",
    closed_lost: "#fb7185",
  }[stage] || "#cbd5e1";
}
