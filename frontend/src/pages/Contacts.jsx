import React, { useMemo, useRef, useState } from "react";
import { Plus, Search, Upload, Download, Trash2, EyeOff, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { http, formatApiErrorDetail, API } from "../lib/api";
import { useData } from "../context/DataContext";
import { formatDate, initials, STATUS_TONES } from "../lib/utils";
import PageHeader from "../components/app/PageHeader";
import { StatusPill } from "../components/app/StatusPill";
import EmptyState from "../components/app/EmptyState";
import Drawer from "../components/app/Drawer";

const ALL_COLUMNS = [
  { id: "name", label: "Name", required: true },
  { id: "title", label: "Title" },
  { id: "company", label: "Company" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "status", label: "Status" },
  { id: "tags", label: "Tags" },
  { id: "owner", label: "Owner" },
  { id: "created_at", label: "Created" },
];

export default function Contacts() {
  const { contacts, setContacts, companies, lookups, fetchAll } = useData();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [visibleCols, setVisibleCols] = useState(ALL_COLUMNS.map((c) => c.id));
  const [showColPanel, setShowColPanel] = useState(false);
  const [open, setOpen] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef(null);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const fullname = `${c.first_name} ${c.last_name}`.toLowerCase();
      if (q && !fullname.includes(q.toLowerCase()) && !(c.email || "").toLowerCase().includes(q.toLowerCase())) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (companyFilter && c.company_id !== companyFilter) return false;
      return true;
    });
  }, [contacts, q, statusFilter, companyFilter]);

  const toggleCol = (id) => {
    setVisibleCols((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  async function handleDelete(id) {
    if (!window.confirm("Delete this contact?")) return;
    try {
      await http.delete(`/contacts/${id}`);
      setContacts((cur) => cur.filter((c) => c.id !== id));
      toast.success("Contact deleted");
      setOpen(null);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  }

  async function handleExport() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/contacts/export/csv`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "contacts.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Contacts exported");
    } catch (e) { toast.error("Export failed"); }
  }

  async function handleImport(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const data = new FormData();
    data.append("file", f);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/contacts/import/csv`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: data,
      });
      const j = await res.json();
      toast.success(`Imported ${j.imported} contacts`);
      fetchAll();
    } catch (err) {
      toast.error("Import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div data-testid="contacts-page">
      <PageHeader title="Contacts" description="People you talk to, all in one rolodex." testid="contacts-header">
        <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleImport} data-testid="contacts-import-input" />
        <button className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} data-testid="contacts-import-btn">
          <Upload className="w-3.5 h-3.5" /> Import CSV
        </button>
        <button className="btn-secondary btn-sm" onClick={handleExport} data-testid="contacts-export-btn">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
        <button className="btn-primary" onClick={() => setShowAdd(true)} data-testid="add-contact-btn">
          <Plus className="w-4 h-4" /> New contact
        </button>
      </PageHeader>

      <div className="px-6 md:px-8 pb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="inp pl-9" placeholder="Search contacts…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="contacts-search" />
        </div>
        <select className="inp max-w-[140px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} data-testid="contacts-status-filter">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="lead">Lead</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="inp max-w-[180px]" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} data-testid="contacts-company-filter">
          <option value="">All companies</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="relative ml-auto">
          <button className="btn-secondary btn-sm" onClick={() => setShowColPanel((v) => !v)} data-testid="contacts-columns-toggle">
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
      </div>

      <div className="px-6 md:px-8 pb-12">
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState title="No contacts match" description="Try adjusting filters or adding a new contact." testid="contacts-empty" />
          ) : (
            <table className="tbl" data-testid="contacts-table">
              <thead>
                <tr>
                  {visibleCols.includes("name") && <th>Name</th>}
                  {visibleCols.includes("title") && <th>Title</th>}
                  {visibleCols.includes("company") && <th>Company</th>}
                  {visibleCols.includes("email") && <th>Email</th>}
                  {visibleCols.includes("phone") && <th>Phone</th>}
                  {visibleCols.includes("status") && <th>Status</th>}
                  {visibleCols.includes("tags") && <th>Tags</th>}
                  {visibleCols.includes("owner") && <th>Owner</th>}
                  {visibleCols.includes("created_at") && <th>Created</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const owner = lookups.userById[c.owner_id];
                  const company = lookups.companyById[c.company_id];
                  return (
                    <tr key={c.id} className="cursor-pointer" onClick={() => setOpen(c)} data-testid={`contact-row-${c.id}`}>
                      {visibleCols.includes("name") && (
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="avatar" style={{ background: owner?.avatar_color || "#0f172a", width: 26, height: 26, fontSize: 10 }}>
                              {initials(`${c.first_name} ${c.last_name}`)}
                            </span>
                            <span className="font-medium text-slate-900">{c.first_name} {c.last_name}</span>
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("title") && <td className="text-slate-600">{c.title || "—"}</td>}
                      {visibleCols.includes("company") && <td className="text-slate-600">{company?.name || "—"}</td>}
                      {visibleCols.includes("email") && <td className="text-slate-600 text-xs">{c.email || "—"}</td>}
                      {visibleCols.includes("phone") && <td className="text-slate-600 font-mono text-xs">{c.phone || "—"}</td>}
                      {visibleCols.includes("status") && <td><StatusPill label={c.status || "—"} tone={STATUS_TONES[c.status] || STATUS_TONES.inactive} /></td>}
                      {visibleCols.includes("tags") && (
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(c.tags || []).map((t) => <span key={t} className="pill-sm bg-slate-50 text-slate-600 border-slate-200">{t}</span>)}
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("owner") && <td className="text-slate-700 text-xs">{owner?.name || "—"}</td>}
                      {visibleCols.includes("created_at") && <td className="text-slate-500 text-xs">{formatDate(c.created_at)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {open && <ContactDrawer contact={open} onClose={() => setOpen(null)} onDelete={() => handleDelete(open.id)} companyName={lookups.companyById[open.company_id]?.name} owner={lookups.userById[open.owner_id]} />}
      {showAdd && <AddContactDrawer onClose={() => setShowAdd(false)} onCreated={() => { fetchAll(); setShowAdd(false); }} companies={companies} />}
    </div>
  );
}

function ContactDrawer({ contact, onClose, onDelete, companyName, owner }) {
  return (
    <Drawer open onClose={onClose}
      title={`${contact.first_name} ${contact.last_name}`}
      subtitle={contact.title ? `${contact.title}${companyName ? " · " + companyName : ""}` : companyName}
      testid="contact-drawer"
      footer={
        <div className="flex items-center justify-between">
          <button className="btn-danger btn-sm" onClick={onDelete} data-testid="contact-delete-btn"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          <button className="btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      }>
      <div className="space-y-4">
        <Field label="Email" value={contact.email ? <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-slate-900 hover:underline"><Mail className="w-3 h-3" />{contact.email}</a> : "—"} />
        <Field label="Phone" value={contact.phone ? <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-slate-900 hover:underline"><Phone className="w-3 h-3" />{contact.phone}</a> : "—"} />
        <Field label="Company" value={companyName || "—"} />
        <Field label="Owner" value={owner?.name || "—"} />
        <Field label="Status" value={<StatusPill label={contact.status || "—"} tone={STATUS_TONES[contact.status] || STATUS_TONES.inactive} />} />
        {(contact.tags || []).length > 0 && (
          <Field label="Tags" value={
            <div className="flex flex-wrap gap-1">
              {(contact.tags || []).map((t) => <span key={t} className="pill-sm bg-slate-50 text-slate-600 border-slate-200">{t}</span>)}
            </div>
          } />
        )}
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

function AddContactDrawer({ onClose, onCreated, companies }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", title: "", company_id: "", status: "active" });
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await http.post("/contacts", { ...form, company_id: form.company_id || null, email: form.email || null });
      toast.success("Contact created");
      onCreated();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Drawer open onClose={onClose} title="New contact" testid="add-contact-drawer"
      footer={<div className="flex items-center justify-end gap-2"><button className="btn-secondary btn-sm" onClick={onClose}>Cancel</button><button className="btn-primary btn-sm" onClick={submit} disabled={saving} data-testid="add-contact-submit">{saving ? "Saving…" : "Create"}</button></div>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">First name</label>
            <input required className="inp" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} data-testid="add-contact-first" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last name</label>
            <input required className="inp" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} data-testid="add-contact-last" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
          <input type="email" className="inp" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone</label>
            <input className="inp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
            <input className="inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company</label>
          <select className="inp" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
            <option value="">— Select company —</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </form>
    </Drawer>
  );
}
