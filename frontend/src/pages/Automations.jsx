import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Workflow, Zap, ArrowDown, Pencil, Power } from "lucide-react";
import { toast } from "sonner";
import { http, formatApiErrorDetail } from "../lib/api";
import { useData } from "../context/DataContext";
import { STAGES, stageById, formatDate } from "../lib/utils";
import PageHeader from "../components/app/PageHeader";
import EmptyState from "../components/app/EmptyState";
import Drawer from "../components/app/Drawer";

const TRIGGERS = [
  { type: "deal_stage_changed", label: "When a deal moves to a stage", needsStage: true, icon: Workflow },
  { type: "deal_created", label: "When a deal is created", icon: Zap },
  { type: "contact_added_to_company", label: "When a contact is added to a company", icon: Zap },
];

const ACTIONS = [
  { type: "create_task", label: "Create a task" },
  { type: "create_call", label: "Create a call" },
  { type: "create_meeting", label: "Create a meeting" },
];

function triggerLabel(t) {
  if (!t) return "—";
  const def = TRIGGERS.find((x) => x.type === t.type);
  let base = def?.label || t.type;
  if (t.to_stage) base += ` → ${stageById(t.to_stage).name}`;
  return base;
}

function actionLabel(a) {
  if (!a) return "—";
  const def = ACTIONS.find((x) => x.type === a.type);
  const base = def?.label || a.type;
  return `${base}: "${a.title || "Untitled"}" • due in ${a.due_offset_days ?? 0}d`;
}

export default function Automations() {
  const { automations, setAutomations } = useData();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    http.get("/automation-logs").then((r) => setLogs(r.data)).catch(() => {});
  }, [automations]);

  async function toggle(rule) {
    try {
      const { data } = await http.patch(`/automations/${rule.id}`, { enabled: !rule.enabled });
      setAutomations((cur) => cur.map((a) => (a.id === data.id ? data : a)));
      toast.success(`Rule ${data.enabled ? "enabled" : "paused"}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await http.delete(`/automations/${id}`);
      setAutomations((cur) => cur.filter((a) => a.id !== id));
      toast.success("Rule deleted");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  }

  return (
    <div data-testid="automations-page">
      <PageHeader title="Automations" description="When-then rules that take care of follow-ups while you focus on closing." testid="automations-header">
        <button className="btn-primary" onClick={() => { setEditing(null); setShowBuilder(true); }} data-testid="new-automation-btn">
          <Plus className="w-4 h-4" /> New rule
        </button>
      </PageHeader>

      <div className="px-6 md:px-8 pb-12 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {automations.length === 0 ? (
            <div className="card">
              <EmptyState title="No rules yet" description="Build your first when-then rule to automate follow-ups." testid="automations-empty" action={
                <button className="btn-primary btn-sm" onClick={() => { setEditing(null); setShowBuilder(true); }}>
                  <Plus className="w-3.5 h-3.5" /> Create a rule
                </button>
              } />
            </div>
          ) : (
            automations.map((rule) => (
              <div key={rule.id} className="card overflow-hidden" data-testid={`automation-card-${rule.id}`}>
                <div className="flex items-start justify-between p-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-display font-semibold text-slate-900 truncate">{rule.name}</h3>
                      {rule.enabled ? (
                        <span className="pill-sm bg-emerald-50 text-emerald-700 border-emerald-200">Active</span>
                      ) : (
                        <span className="pill-sm bg-slate-50 text-slate-500 border-slate-200">Paused</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Created {formatDate(rule.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="btn-ghost" onClick={() => toggle(rule)} data-testid={`automation-toggle-${rule.id}`} title={rule.enabled ? "Pause" : "Enable"}>
                      <Power className={`w-4 h-4 ${rule.enabled ? "text-emerald-600" : "text-slate-400"}`} />
                    </button>
                    <button className="btn-ghost" onClick={() => { setEditing(rule); setShowBuilder(true); }} data-testid={`automation-edit-${rule.id}`}>
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </button>
                    <button className="btn-ghost" onClick={() => remove(rule.id)} data-testid={`automation-delete-${rule.id}`}>
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                    </button>
                  </div>
                </div>
                <div className="border-t border-slate-200 px-5 py-4 bg-slate-50/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="pill-sm bg-blue-50 text-blue-700 border-blue-200 font-mono">WHEN</span>
                    <span className="text-sm text-slate-900 font-medium">{triggerLabel(rule.trigger)}</span>
                  </div>
                  <div className="ml-3 text-slate-300"><ArrowDown className="w-4 h-4" /></div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="pill-sm bg-emerald-50 text-emerald-700 border-emerald-200 font-mono">THEN</span>
                    <span className="text-sm text-slate-900 font-medium">{actionLabel(rule.action)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card overflow-hidden h-fit lg:sticky lg:top-6">
          <div className="card-header">
            <h3 className="card-title">Recent automation runs</h3>
            <span className="text-xs text-slate-500">last 50</span>
          </div>
          <div className="card-body p-0 max-h-[60vh] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No runs yet. Move a deal to Closed Won to trigger your first automation.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <li key={l.id} className="px-5 py-3 hover:bg-slate-50">
                    <div className="text-sm font-medium text-slate-900">{l.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{l.action_taken}</div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">{l.trigger_event} · {formatDate(l.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {showBuilder && (
        <AutomationBuilder
          initial={editing}
          onClose={() => setShowBuilder(false)}
          onSaved={(saved) => {
            setAutomations((cur) => {
              const idx = cur.findIndex((a) => a.id === saved.id);
              if (idx >= 0) {
                const copy = [...cur]; copy[idx] = saved; return copy;
              }
              return [saved, ...cur];
            });
            setShowBuilder(false);
          }}
        />
      )}
    </div>
  );
}

function AutomationBuilder({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [triggerType, setTriggerType] = useState(initial?.trigger?.type || "deal_stage_changed");
  const [toStage, setToStage] = useState(initial?.trigger?.to_stage || "closed_won");
  const [actionType, setActionType] = useState(initial?.action?.type || "create_task");
  const [actionTitle, setActionTitle] = useState(initial?.action?.title || "");
  const [dueOffset, setDueOffset] = useState(initial?.action?.due_offset_days ?? 1);
  const [saving, setSaving] = useState(false);

  const needsStage = triggerType === "deal_stage_changed";

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: name || "Untitled rule",
      enabled,
      trigger: needsStage ? { type: triggerType, to_stage: toStage } : { type: triggerType },
      conditions: [],
      action: { type: actionType, title: actionTitle || "Follow up", due_offset_days: Number(dueOffset || 0) },
    };
    try {
      if (initial?.id) {
        const { data } = await http.patch(`/automations/${initial.id}`, body);
        toast.success("Rule updated");
        onSaved(data);
      } else {
        const { data } = await http.post(`/automations`, body);
        toast.success("Rule created");
        onSaved(data);
      }
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally { setSaving(false); }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial ? "Edit automation" : "New automation"}
      testid="automation-builder"
      footer={
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer" data-testid="automation-enabled-toggle">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4" />
            <span>Active</span>
          </label>
          <div className="flex items-center gap-2">
            <button className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn-primary btn-sm" onClick={save} disabled={saving} data-testid="automation-save">{saving ? "Saving…" : initial ? "Save changes" : "Create rule"}</button>
          </div>
        </div>
      }
    >
      <form onSubmit={save} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rule name</label>
          <input className="inp" placeholder="e.g. Welcome new Closed Won deals" value={name} onChange={(e) => setName(e.target.value)} required data-testid="automation-name" />
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex items-center gap-2">
            <span className="pill-sm bg-white text-blue-700 border-blue-200 font-mono">WHEN</span>
            <span className="text-xs text-slate-600">a trigger fires</span>
          </div>
          <div className="p-4 space-y-3">
            <select className="inp" value={triggerType} onChange={(e) => setTriggerType(e.target.value)} data-testid="automation-trigger-type">
              {TRIGGERS.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
            {needsStage && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target stage</label>
                <select className="inp" value={toStage} onChange={(e) => setToStage(e.target.value)} data-testid="automation-target-stage">
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center -my-2">
          <ArrowDown className="w-5 h-5 text-slate-400" />
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center gap-2">
            <span className="pill-sm bg-white text-emerald-700 border-emerald-200 font-mono">THEN</span>
            <span className="text-xs text-slate-600">perform this action</span>
          </div>
          <div className="p-4 space-y-3">
            <select className="inp" value={actionType} onChange={(e) => setActionType(e.target.value)} data-testid="automation-action-type">
              {ACTIONS.map((a) => <option key={a.type} value={a.type}>{a.label}</option>)}
            </select>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
              <input required className="inp" placeholder="e.g. Send onboarding plan" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} data-testid="automation-action-title" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due in (days)</label>
              <input required type="number" min={0} max={365} className="inp max-w-[140px]" value={dueOffset} onChange={(e) => setDueOffset(e.target.value)} data-testid="automation-due-offset" />
            </div>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
