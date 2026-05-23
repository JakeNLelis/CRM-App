import React, { useMemo, useRef, useState } from "react";
import {
  Plus, Search, KanbanSquare, Table as TableIcon, Trash2, Upload, Download, EyeOff,
} from "lucide-react";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, DragOverlay,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { toast } from "sonner";
import { http, formatApiErrorDetail, API } from "../lib/api";
import { useData } from "../context/DataContext";
import { STAGES, stageById, formatCurrency, formatCurrencyFull, formatDate, initials, STATUS_TONES, PRIORITIES } from "../lib/utils";
import PageHeader from "../components/app/PageHeader";
import { StageChip, StatusPill } from "../components/app/StatusPill";
import EmptyState from "../components/app/EmptyState";
import Drawer from "../components/app/Drawer";

const ALL_COLUMNS = [
  { id: "name", label: "Deal", required: true },
  { id: "company", label: "Company" },
  { id: "stage", label: "Stage" },
  { id: "value", label: "Value" },
  { id: "priority", label: "Priority" },
  { id: "probability", label: "Probability" },
  { id: "owner", label: "Owner" },
  { id: "expected_close_date", label: "Close date" },
];

export default function Deals() {
  const { deals, setDeals, companies, contacts, activities, lookups, fetchAll } = useData();
  const [view, setView] = useState("list"); // "list" | "kanban"
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [valueRange, setValueRange] = useState({ min: "", max: "" });
  const [visibleCols, setVisibleCols] = useState(ALL_COLUMNS.map((c) => c.id));
  const [showColPanel, setShowColPanel] = useState(false);
  const [open, setOpen] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef(null);

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (q && !d.name?.toLowerCase().includes(q.toLowerCase())) return false;
      if (stageFilter && d.stage !== stageFilter) return false;
      if (priorityFilter && d.priority !== priorityFilter) return false;
      if (ownerFilter && d.owner_id !== ownerFilter) return false;
      if (valueRange.min && Number(d.value) < Number(valueRange.min)) return false;
      if (valueRange.max && Number(d.value) > Number(valueRange.max)) return false;
      return true;
    });
  }, [deals, q, stageFilter, priorityFilter, ownerFilter, valueRange]);

  const toggleCol = (id) => setVisibleCols((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function handleStageChange(dealId, newStage) {
    // Optimistic update
    setDeals((cur) => cur.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)));
    try {
      const { data } = await http.patch(`/deals/${dealId}`, { stage: newStage });
      setDeals((cur) => cur.map((d) => (d.id === dealId ? data : d)));
      toast.success(`Moved to ${stageById(newStage).name}`);
      // refetch activities (automations may have created tasks)
      fetchAll();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
      fetchAll();
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this deal?")) return;
    try {
      await http.delete(`/deals/${id}`);
      setDeals((cur) => cur.filter((d) => d.id !== id));
      toast.success("Deal deleted");
      setOpen(null);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  }

  async function handleExport() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/deals/export/csv`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "deals.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Deals exported");
    } catch (e) { toast.error("Export failed"); }
  }

  async function handleImport(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const data = new FormData();
    data.append("file", f);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/deals/import/csv`, {
        method: "POST", credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: data,
      });
      const j = await res.json();
      toast.success(`Imported ${j.imported} deals`);
      fetchAll();
    } catch (err) {
      toast.error("Import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div data-testid="deals-page">
      <PageHeader title="Deals" description="Drag, drop, win. Manage every opportunity with a view that fits the moment." testid="deals-header">
        <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleImport} data-testid="deals-import-input" />
        <button className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} data-testid="deals-import-btn">
          <Upload className="w-3.5 h-3.5" /> Import
        </button>
        <button className="btn-secondary btn-sm" onClick={handleExport} data-testid="deals-export-btn">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
        <button className="btn-primary" onClick={() => setShowAdd(true)} data-testid="add-deal-btn">
          <Plus className="w-4 h-4" /> New deal
        </button>
      </PageHeader>

      {/* Toolbar */}
      <div className="px-6 md:px-8 pb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="inp pl-9" placeholder="Search deals…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="deals-search" />
        </div>
        <select className="inp max-w-[150px]" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} data-testid="deals-stage-filter">
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="inp max-w-[140px]" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} data-testid="deals-priority-filter">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="inp max-w-[160px]" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} data-testid="deals-owner-filter">
          <option value="">All owners</option>
          {Object.values(lookups.userById).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input type="number" className="inp max-w-[110px]" placeholder="Min $" value={valueRange.min} onChange={(e) => setValueRange({ ...valueRange, min: e.target.value })} data-testid="deals-min-value" />
        <input type="number" className="inp max-w-[110px]" placeholder="Max $" value={valueRange.max} onChange={(e) => setValueRange({ ...valueRange, max: e.target.value })} data-testid="deals-max-value" />

        <div className="ml-auto flex items-center gap-2">
          {/* View switcher */}
          <div className="flex bg-slate-100 border border-slate-200 rounded-md p-0.5" data-testid="deals-view-switcher">
            <button onClick={() => setView("list")} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${view === "list" ? "bg-white text-slate-900 shadow-soft" : "text-slate-500"}`} data-testid="deals-view-list">
              <TableIcon className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => setView("kanban")} className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${view === "kanban" ? "bg-white text-slate-900 shadow-soft" : "text-slate-500"}`} data-testid="deals-view-kanban">
              <KanbanSquare className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>
          {view === "list" && (
            <div className="relative">
              <button className="btn-secondary btn-sm" onClick={() => setShowColPanel((v) => !v)} data-testid="deals-columns-toggle">
                <EyeOff className="w-3.5 h-3.5" /> Columns
              </button>
              {showColPanel && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-ring p-2 z-30 animate-fadeIn">
                  {ALL_COLUMNS.map((col) => (
                    <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 text-sm">
                      <input type="checkbox" checked={visibleCols.includes(col.id)} disabled={col.required} onChange={() => toggleCol(col.id)} />
                      <span className={col.required ? "text-slate-400" : "text-slate-700"}>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {view === "list" ? (
        <DealsTable deals={filtered} visibleCols={visibleCols} onRowClick={setOpen} lookups={lookups} onStageChange={handleStageChange} />
      ) : (
        <DealsKanban deals={filtered} onCardClick={setOpen} onStageChange={handleStageChange} lookups={lookups} />
      )}

      {open && (
        <DealDrawer
          deal={open}
          onClose={() => setOpen(null)}
          onDelete={() => handleDelete(open.id)}
          onUpdate={async (updates) => {
            try {
              const { data } = await http.patch(`/deals/${open.id}`, updates);
              setDeals((cur) => cur.map((d) => (d.id === data.id ? data : d)));
              setOpen(data);
              toast.success("Saved");
              if (updates.stage) fetchAll();
            } catch (e) {
              toast.error(formatApiErrorDetail(e.response?.data?.detail));
            }
          }}
          company={lookups.companyById[open.company_id]}
          contact={lookups.contactById[open.primary_contact_id]}
          owner={lookups.userById[open.owner_id]}
          activities={activities.filter((a) => a.deal_id === open.id)}
        />
      )}
      {showAdd && (
        <AddDealDrawer onClose={() => setShowAdd(false)} onCreated={() => { fetchAll(); setShowAdd(false); }} companies={companies} contacts={contacts} />
      )}
    </div>
  );
}

// ============ LIST VIEW ============
function DealsTable({ deals, visibleCols, onRowClick, lookups, onStageChange }) {
  if (deals.length === 0) {
    return (
      <div className="px-6 md:px-8 pb-12">
        <div className="card overflow-hidden">
          <EmptyState title="No deals match" description="Adjust your filters or add a new deal." testid="deals-empty" />
        </div>
      </div>
    );
  }
  return (
    <div className="px-6 md:px-8 pb-12">
      <div className="card overflow-hidden">
        <table className="tbl" data-testid="deals-table">
          <thead>
            <tr>
              {visibleCols.includes("name") && <th>Deal</th>}
              {visibleCols.includes("company") && <th>Company</th>}
              {visibleCols.includes("stage") && <th>Stage</th>}
              {visibleCols.includes("value") && <th className="text-right">Value</th>}
              {visibleCols.includes("priority") && <th>Priority</th>}
              {visibleCols.includes("probability") && <th className="text-right">Probability</th>}
              {visibleCols.includes("owner") && <th>Owner</th>}
              {visibleCols.includes("expected_close_date") && <th>Close date</th>}
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => {
              const stage = stageById(d.stage);
              const owner = lookups.userById[d.owner_id];
              const priority = PRIORITIES.find((p) => p.id === d.priority);
              return (
                <tr key={d.id} className="cursor-pointer" onClick={() => onRowClick(d)} data-testid={`deal-row-${d.id}`}>
                  {visibleCols.includes("name") && (
                    <td>
                      <span className="font-medium text-slate-900">{d.name}</span>
                    </td>
                  )}
                  {visibleCols.includes("company") && <td className="text-slate-600">{lookups.companyById[d.company_id]?.name || "—"}</td>}
                  {visibleCols.includes("stage") && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <StageInlineSelect deal={d} onChange={(s) => onStageChange(d.id, s)} />
                    </td>
                  )}
                  {visibleCols.includes("value") && <td className="text-right font-mono text-xs text-slate-900 font-medium">{formatCurrency(d.value)}</td>}
                  {visibleCols.includes("priority") && (
                    <td>{priority && <span className={`pill-sm ${priority.tone}`}>{priority.name}</span>}</td>
                  )}
                  {visibleCols.includes("probability") && (
                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded overflow-hidden">
                          <div className="h-full bg-slate-900" style={{ width: `${d.probability || 0}%` }} />
                        </div>
                        <span className="text-xs font-mono text-slate-600 w-8 text-right">{d.probability || 0}%</span>
                      </div>
                    </td>
                  )}
                  {visibleCols.includes("owner") && (
                    <td>
                      {owner ? (
                        <div className="flex items-center gap-2">
                          <span className="avatar" style={{ background: owner.avatar_color || "#0f172a", width: 22, height: 22, fontSize: 9 }}>{initials(owner.name)}</span>
                          <span className="text-slate-700 text-xs">{owner.name}</span>
                        </div>
                      ) : "—"}
                    </td>
                  )}
                  {visibleCols.includes("expected_close_date") && <td className="text-slate-500 text-xs">{formatDate(d.expected_close_date)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StageInlineSelect({ deal, onChange }) {
  const stage = stageById(deal.stage);
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button className={`stage-chip ${stage.tone} hover:opacity-80`} onClick={() => setOpen((v) => !v)} data-testid={`deal-stage-${deal.id}`}>
        {stage.name}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 left-0 w-44 bg-white border border-slate-200 rounded-md shadow-ring p-1 animate-fadeIn">
          {STAGES.map((s) => (
            <button
              key={s.id}
              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-between"
              onClick={() => { setOpen(false); onChange(s.id); }}
              data-testid={`deal-stage-option-${deal.id}-${s.id}`}
            >
              {s.name}
              {s.id === deal.stage && <span className="text-emerald-600 text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ KANBAN ============
function DealsKanban({ deals, onCardClick, onStageChange, lookups }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState(null);
  const activeDeal = deals.find((d) => d.id === activeId);

  function handleDragEnd(event) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = active.id;
    const newStage = over.id;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    if (deal.stage === newStage) return;
    if (!STAGES.find((s) => s.id === newStage)) return;
    onStageChange(dealId, newStage);
  }

  return (
    <div className="px-6 md:px-8 pb-12" data-testid="kanban-board">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const colDeals = deals.filter((d) => d.stage === stage.id);
            const total = colDeals.reduce((sum, d) => sum + (d.value || 0), 0);
            return (
              <KanbanColumn key={stage.id} stage={stage} total={total} count={colDeals.length}>
                {colDeals.map((d) => (
                  <KanbanCard key={d.id} deal={d} onClick={() => onCardClick(d)} lookups={lookups} />
                ))}
                {colDeals.length === 0 && (
                  <div className="text-[11px] text-slate-400 italic px-1">Drop a deal here</div>
                )}
              </KanbanColumn>
            );
          })}
        </div>
        <DragOverlay>
          {activeDeal && <DragPreview deal={activeDeal} lookups={lookups} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({ stage, total, count, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div ref={setNodeRef} className={`kanban-col transition-colors ${isOver ? "ring-2 ring-slate-900 ring-offset-2" : ""}`} data-testid={`kanban-col-${stage.id}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`stage-chip ${stage.tone}`}>{stage.name}</span>
          <span className="text-[11px] text-slate-500 font-mono">{count}</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">{formatCurrency(total)}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-[60px]">{children}</div>
    </div>
  );
}

function KanbanCard({ deal, onClick, lookups }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  const owner = lookups.userById[deal.owner_id];
  const company = lookups.companyById[deal.company_id];
  const priority = PRIORITIES.find((p) => p.id === deal.priority);
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // only consider as click if not dragged
        if (!isDragging) onClick();
      }}
      className={`kanban-card ${isDragging ? "opacity-30" : ""}`}
      data-testid={`kanban-card-${deal.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-slate-900 leading-snug">{deal.name}</h4>
      </div>
      {company && <div className="text-xs text-slate-500 mt-1">{company.name}</div>}
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm font-display font-semibold text-slate-900">{formatCurrency(deal.value)}</span>
        {priority && <span className={`pill-sm ${priority.tone}`}>{priority.name}</span>}
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="text-[11px] text-slate-400">{formatDate(deal.expected_close_date)}</div>
        {owner && (
          <span className="avatar" style={{ background: owner.avatar_color || "#0f172a", width: 22, height: 22, fontSize: 9 }} title={owner.name}>
            {initials(owner.name)}
          </span>
        )}
      </div>
    </div>
  );
}

function DragPreview({ deal, lookups }) {
  return (
    <div className="kanban-card shadow-ring border-slate-300 rotate-1 max-w-[260px]">
      <div className="text-sm font-medium text-slate-900">{deal.name}</div>
      <div className="text-xs text-slate-500 mt-1">{lookups.companyById[deal.company_id]?.name || ""}</div>
      <div className="mt-2 text-sm font-display font-semibold">{formatCurrency(deal.value)}</div>
    </div>
  );
}

// ============ DEAL DRAWER ============
function DealDrawer({ deal, onClose, onDelete, onUpdate, company, contact, owner, activities }) {
  const stage = stageById(deal.stage);
  const [stageOpen, setStageOpen] = useState(false);
  return (
    <Drawer
      open
      onClose={onClose}
      title={deal.name}
      subtitle={company ? `${company.name}${contact ? " • " + contact.first_name + " " + contact.last_name : ""}` : ""}
      testid="deal-drawer"
      footer={
        <div className="flex items-center justify-between">
          <button className="btn-danger btn-sm" onClick={onDelete} data-testid="deal-delete-btn"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          <button className="btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="card-body !p-4 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Value</div>
            <div className="text-2xl font-display font-medium text-slate-900">{formatCurrencyFull(deal.value)}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Stage</div>
            <div className="relative">
              <button className={`stage-chip ${stage.tone}`} onClick={() => setStageOpen((v) => !v)} data-testid="deal-drawer-stage">
                {stage.name}
              </button>
              {stageOpen && (
                <div className="absolute right-0 z-30 mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-ring p-1 animate-fadeIn">
                  {STAGES.map((s) => (
                    <button key={s.id} className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-50 text-xs font-medium text-slate-700" onClick={() => { setStageOpen(false); onUpdate({ stage: s.id }); }} data-testid={`deal-drawer-stage-option-${s.id}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner" value={owner?.name || "—"} />
          <Field label="Probability" value={`${deal.probability || 0}%`} />
          <Field label="Priority" value={deal.priority || "—"} />
          <Field label="Status" value={<StatusPill label={deal.status} tone={STATUS_TONES[deal.status] || STATUS_TONES.open} />} />
          <Field label="Close date" value={formatDate(deal.expected_close_date)} />
          <Field label="Created" value={formatDate(deal.created_at)} />
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Activity timeline</div>
          {activities.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="relative space-y-3 ml-3 border-l border-slate-200 pl-4">
              {activities.slice().sort((a, b) => new Date(b.due_date || 0) - new Date(a.due_date || 0)).map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-2 w-2 h-2 rounded-full bg-slate-300" />
                  <div className="text-sm font-medium text-slate-900">{a.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 capitalize flex items-center gap-2">
                    <span>{a.type}</span>
                    <span>•</span>
                    <span>{formatDate(a.due_date)}</span>
                    <span>•</span>
                    <StatusPill label={a.status} tone={STATUS_TONES[a.status] || STATUS_TONES.pending} dot={false} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

function AddDealDrawer({ onClose, onCreated, companies, contacts }) {
  const [form, setForm] = useState({
    name: "", value: "", stage: "new_lead", company_id: "", primary_contact_id: "",
    priority: "medium", probability: 50, expected_close_date: "",
  });
  const [saving, setSaving] = useState(false);

  const filteredContacts = form.company_id ? contacts.filter((c) => c.company_id === form.company_id) : contacts;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await http.post("/deals", {
        ...form,
        value: Number(form.value || 0),
        probability: Number(form.probability || 0),
        company_id: form.company_id || null,
        primary_contact_id: form.primary_contact_id || null,
        expected_close_date: form.expected_close_date || null,
      });
      toast.success("Deal created");
      onCreated();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally { setSaving(false); }
  }

  return (
    <Drawer open onClose={onClose} title="New deal" testid="add-deal-drawer"
      footer={<div className="flex items-center justify-end gap-2"><button className="btn-secondary btn-sm" onClick={onClose}>Cancel</button><button className="btn-primary btn-sm" onClick={submit} disabled={saving} data-testid="add-deal-submit">{saving ? "Saving…" : "Create deal"}</button></div>}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deal name</label>
          <input required className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="add-deal-name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Value ($)</label>
            <input type="number" required className="inp" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} data-testid="add-deal-value" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Stage</label>
            <select className="inp" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} data-testid="add-deal-stage">
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company</label>
            <select className="inp" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value, primary_contact_id: "" })}>
              <option value="">— Select —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary contact</label>
            <select className="inp" value={form.primary_contact_id} onChange={(e) => setForm({ ...form, primary_contact_id: e.target.value })}>
              <option value="">— Select —</option>
              {filteredContacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority</label>
            <select className="inp" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Probability (%)</label>
            <input type="number" min={0} max={100} className="inp" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Close date</label>
            <input type="date" className="inp" value={form.expected_close_date?.slice?.(0, 10) || ""} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
          </div>
        </div>
      </form>
    </Drawer>
  );
}
