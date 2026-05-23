import React from "react";
import { useAuth } from "../context/AuthContext";
import { initials, formatDate } from "../lib/utils";
import PageHeader from "../components/app/PageHeader";

export default function Settings() {
  const { user } = useAuth();
  return (
    <div data-testid="settings-page">
      <PageHeader title="Settings" description="Account, workspace, and integrations." testid="settings-header" />
      <div className="px-6 md:px-8 pb-12 grid md:grid-cols-3 gap-6">
        <div className="card md:col-span-2">
          <div className="card-header"><h3 className="card-title">Profile</h3></div>
          <div className="card-body flex items-start gap-5">
            <span className="avatar" style={{ background: user?.avatar_color || "#0f172a", width: 56, height: 56, fontSize: 20 }}>
              {initials(user?.name || user?.email || "?")}
            </span>
            <div className="flex-1 space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Name</div>
                <div className="text-base font-medium text-slate-900">{user?.name}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Email</div>
                <div className="text-sm text-slate-900">{user?.email}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Role</div>
                <div className="text-sm text-slate-900 capitalize">{user?.role}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Member since</div>
                <div className="text-sm text-slate-900">{formatDate(user?.created_at)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card h-fit">
          <div className="card-header"><h3 className="card-title">Workspace</h3></div>
          <div className="card-body space-y-3 text-sm">
            <Row label="Workspace" value="Acme Corp" />
            <Row label="Plan" value="Free preview" />
            <Row label="Region" value="us-east-1" />
            <Row label="Theme" value="Modern minimal" />
          </div>
        </div>

        <div className="card md:col-span-3">
          <div className="card-header"><h3 className="card-title">Demo team accounts</h3></div>
          <div className="card-body">
            <p className="text-sm text-slate-500 mb-4">These seeded users can be picked as deal owners. They all share the same demo password.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {["Sarah Kim", "Marcus Lee", "Elena Rossi", "David Patel"].map((n) => (
                <div key={n} className="border border-slate-200 rounded-md p-3 flex items-center gap-3">
                  <span className="avatar" style={{ background: "#0f172a" }}>{initials(n)}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{n}</div>
                    <div className="text-xs text-slate-500 truncate">Demo@1234</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
      <span className="text-sm text-slate-900">{value}</span>
    </div>
  );
}
