import React, { useMemo, useState } from "react";
import { Plus, Phone, CalendarDays, ListChecks, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { http, formatApiErrorDetail } from "../lib/api";
import { useData } from "../context/DataContext";
import { formatDate, initials, STATUS_TONES, relativeDate } from "../lib/utils";
import PageHeader from "../components/app/PageHeader";
import { StatusPill } from "../components/app/StatusPill";
import EmptyState from "../components/app/EmptyState";
import Drawer from "../components/app/Drawer";

const TYPES = [
  { id: "all", label: "All", icon: ListChecks },
  { id: "call", label: "Calls", icon: Phone },
  { id: "meeting", label: "Meetings", icon: CalendarDays },
  { id: "task", label: "Tasks", icon: ListChecks },
];

export default function Activities() {
  const { activities, setActivities, lookups, deals, contacts, fetchAll } = useData();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.due_date || 0) - new Date(a.due_date || 0));
  }, [activities, typeFilter, statusFilter]);

  async function toggleStatus(a) {
    const next = a.status === "done" ? "pending" : "done";
    try {
      const { data } = await http.patch(`/activities/${a.id}`, { status: next });
      setActivities((cur) => cur.map((x) => (x.id === data.id ? data : x)));
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this activity?")) return;
    try {
      await http.delete(`/activities/${id}`);
      setActivities((cur) => cur.filter((a) => a.id !== id));
      toast.success("Activity deleted");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  }

  return (
    <div data-testid="activities-page">
      <PageHeader title="Activities" description="Calls, meetings, and tasks — the heartbeat of every deal." testid="activities-header">
        <button className="btn-primary" onClick={() => setShowAdd(true)} data-testid="add-activity-btn">
          <Plus className="w-4 h-4" /> New activity
        </button>
      </PageHeader>

      <div className="px-6 md:px-8 pb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex bg-slate-100 border border-slate-200 rounded-md p-0.5" data-testid="activities-type-tabs">
          {TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium ${typeFilter === t.id ? "bg-white text-slate-900 shadow-soft" : "text-slate-500"}`}
                data-testid={`activities-tab-${t.id}`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
        <select className="inp max-w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="activities-status-filter">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div className="px-6 md:px-8 pb-12">
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState title="No activities" description="Get started by adding a call, meeting, or task." testid="activities-empty" />
          ) : (
            <table className="tbl" data-testid="activities-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Activity</th>
                  <th>Type</th>
                  <th>Deal</th>
                  <th>Owner</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const isOverdue = a.status === "pending" && a.due_date && new Date(a.due_date) < new Date();
                  const owner = lookups.userById[a.owner_id];
                  const deal = lookups.dealById[a.deal_id];
                  return (
                    <tr key={a.id} data-testid={`activity-row-${a.id}`}>
                      <td className="w-10">
                        <button
                          onClick={() => toggleStatus(a)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center ${a.status === "done" ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-slate-500"}`}
                          data-testid={`activity-toggle-${a.id}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </button>
                      </td>
                      <td>
                        <span className={`font-medium ${a.status === "done" ? "text-slate-400 line-through" : "text-slate-900"}`}>{a.title}</span>
                        {a.automation_id && <span className="ml-2 pill-sm bg-violet-50 text-violet-700 border-violet-200" title="Created by automation">auto</span>}
                      </td>
                      <td className="capitalize text-slate-700 text-xs">{a.type}</td>
                      <td className="text-slate-600 text-xs">{deal?.name || "—"}</td>
                      <td>
                        {owner ? (
                          <div className="flex items-center gap-2">
                            <span className="avatar" style={{ background: owner.avatar_color || "#0f172a", width: 22, height: 22, fontSize: 9 }}>{initials(owner.name)}</span>
                            <span className="text-slate-700 text-xs">{owner.name}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className={`text-xs ${isOverdue ? "text-rose-700 font-medium" : "text-slate-500"}`}>
                        {formatDate(a.due_date)}
                        <div className="text-[10px] text-slate-400">{relativeDate(a.due_date)}</div>
                      </td>
                      <td><StatusPill label={isOverdue ? "overdue" : a.status} tone={isOverdue ? STATUS_TONES.overdue : (STATUS_TONES[a.status] || STATUS_TONES.pending)} /></td>
                      <td className="text-right">
                        <button className="btn-ghost" onClick={() => handleDelete(a.id)} data-testid={`activity-delete-${a.id}`}>
                          <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && (
        <AddActivityDrawer onClose={() => setShowAdd(false)} onCreated={() => { fetchAll(); setShowAdd(false); }} deals={deals} contacts={contacts} />
      )}
    </div>
  );
}

function AddActivityDrawer({ onClose, onCreated, deals, contacts }) {
  const [form, setForm] = useState({ type: "task", title: "", description: "", deal_id: "", contact_id: "", due_date: "" });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await http.post("/activities", {
        ...form,
        deal_id: form.deal_id || null,
        contact_id: form.contact_id || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      });
      toast.success("Activity created");
      onCreated();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally { setSaving(false); }
  }
  return (
    <Drawer open onClose={onClose} title="New activity" testid="add-activity-drawer"
      footer={<div className="flex items-center justify-end gap-2"><button className="btn-secondary btn-sm" onClick={onClose}>Cancel</button><button className="btn-primary btn-sm" onClick={submit} disabled={saving} data-testid="add-activity-submit">{saving ? "Saving…" : "Create"}</button></div>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {["task", "call", "meeting"].map((t) => (
            <button type="button" key={t} onClick={() => setForm({ ...form, type: t })} className={`border rounded-md px-3 py-2 text-sm font-medium capitalize ${form.type === t ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-700"}`} data-testid={`add-activity-type-${t}`}>
              {t}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
          <input required className="inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="add-activity-title" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
          <textarea className="inp min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Related deal</label>
            <select className="inp" value={form.deal_id} onChange={(e) => setForm({ ...form, deal_id: e.target.value })}>
              <option value="">— None —</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Related contact</label>
            <select className="inp" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
              <option value="">— None —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due date</label>
          <input type="datetime-local" className="inp" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </div>
      </form>
    </Drawer>
  );
}
