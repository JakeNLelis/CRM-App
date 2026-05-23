import React, { useMemo, useState } from "react";
import { Plus, Search, Building2, Globe, MapPin, Users, Trash2, Filter, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { http, formatApiErrorDetail } from "../lib/api";
import { useData } from "../context/DataContext";
import { formatCurrency, formatCurrencyFull, formatDate, initials, STATUS_TONES } from "../lib/utils";
import PageHeader from "../components/app/PageHeader";
import { StatusPill } from "../components/app/StatusPill";
import EmptyState from "../components/app/EmptyState";
import Drawer from "../components/app/Drawer";

const ALL_COLUMNS = [
  { id: "name", label: "Name", required: true },
  { id: "industry", label: "Industry" },
  { id: "status", label: "Status" },
  { id: "location", label: "Location" },
  { id: "employees", label: "Employees" },
  { id: "annual_revenue", label: "Revenue" },
  { id: "owner", label: "Owner" },
  { id: "created_at", label: "Created" },
];

export default function Companies() {
  const { companies, setCompanies, contacts, deals, lookups, fetchAll } = useData();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [visibleCols, setVisibleCols] = useState(ALL_COLUMNS.map((c) => c.id));
  const [showColPanel, setShowColPanel] = useState(false);
  const [openCompany, setOpenCompany] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const industries = useMemo(() => {
    return Array.from(new Set(companies.map((c) => c.industry).filter(Boolean)));
  }, [companies]);

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (q && !c.name?.toLowerCase().includes(q.toLowerCase())) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (industryFilter && c.industry !== industryFilter) return false;
      return true;
    });
  }, [companies, q, statusFilter, industryFilter]);

  const toggleCol = (id) => {
    setVisibleCols((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  async function handleDelete(id) {
    if (!window.confirm("Delete this company?")) return;
    try {
      await http.delete(`/companies/${id}`);
      setCompanies((cur) => cur.filter((c) => c.id !== id));
      toast.success("Company deleted");
      setOpenCompany(null);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  }

  return (
    <div data-testid="companies-page">
      <PageHeader title="Companies" description="Every account in your book, all in one place." testid="companies-header">
        <button className="btn-primary" onClick={() => setShowAdd(true)} data-testid="add-company-btn">
          <Plus className="w-4 h-4" /> New company
        </button>
      </PageHeader>

      {/* Toolbar */}
      <div className="px-6 md:px-8 pb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="inp pl-9"
            placeholder="Search companies…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="companies-search"
          />
        </div>
        <select
          className="inp max-w-[140px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="companies-status-filter"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="churned">Churned</option>
        </select>
        <select
          className="inp max-w-[160px]"
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          data-testid="companies-industry-filter"
        >
          <option value="">All industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <div className="relative ml-auto">
          <button className="btn-secondary btn-sm" onClick={() => setShowColPanel((v) => !v)} data-testid="columns-toggle">
            <EyeOff className="w-3.5 h-3.5" /> Columns
          </button>
          {showColPanel && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-ring p-2 z-30 animate-fadeIn">
              {ALL_COLUMNS.map((col) => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 text-sm">
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(col.id)}
                    disabled={col.required}
                    onChange={() => toggleCol(col.id)}
                    data-testid={`col-toggle-${col.id}`}
                  />
                  <span className={col.required ? "text-slate-400" : "text-slate-700"}>{col.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="px-6 md:px-8 pb-12">
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState title="No companies match" description="Try removing filters or adding your first account." testid="companies-empty" />
          ) : (
            <table className="tbl" data-testid="companies-table">
              <thead>
                <tr>
                  {visibleCols.includes("name") && <th>Name</th>}
                  {visibleCols.includes("industry") && <th>Industry</th>}
                  {visibleCols.includes("status") && <th>Status</th>}
                  {visibleCols.includes("location") && <th>Location</th>}
                  {visibleCols.includes("employees") && <th className="text-right">Employees</th>}
                  {visibleCols.includes("annual_revenue") && <th className="text-right">Revenue</th>}
                  {visibleCols.includes("owner") && <th>Owner</th>}
                  {visibleCols.includes("created_at") && <th>Created</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const owner = lookups.userById[c.owner_id];
                  return (
                    <tr key={c.id} className="cursor-pointer" onClick={() => setOpenCompany(c)} data-testid={`company-row-${c.id}`}>
                      {visibleCols.includes("name") && (
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                              {initials(c.name)}
                            </span>
                            <span className="font-medium text-slate-900">{c.name}</span>
                          </div>
                        </td>
                      )}
                      {visibleCols.includes("industry") && <td className="text-slate-600">{c.industry || "—"}</td>}
                      {visibleCols.includes("status") && (
                        <td>
                          <StatusPill label={c.status || "—"} tone={STATUS_TONES[c.status] || STATUS_TONES.inactive} />
                        </td>
                      )}
                      {visibleCols.includes("location") && <td className="text-slate-600">{c.location || "—"}</td>}
                      {visibleCols.includes("employees") && <td className="text-right text-slate-600 font-mono text-xs">{c.employees ?? "—"}</td>}
                      {visibleCols.includes("annual_revenue") && (
                        <td className="text-right text-slate-700 font-medium font-mono text-xs">
                          {c.annual_revenue ? formatCurrency(c.annual_revenue) : "—"}
                        </td>
                      )}
                      {visibleCols.includes("owner") && (
                        <td>
                          {owner ? (
                            <div className="flex items-center gap-2">
                              <span className="avatar" style={{ background: owner.avatar_color || "#0f172a", width: 22, height: 22, fontSize: 9 }}>
                                {initials(owner.name)}
                              </span>
                              <span className="text-slate-700 text-xs">{owner.name}</span>
                            </div>
                          ) : "—"}
                        </td>
                      )}
                      {visibleCols.includes("created_at") && <td className="text-slate-500 text-xs">{formatDate(c.created_at)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {openCompany && (
        <CompanyDrawer
          company={openCompany}
          onClose={() => setOpenCompany(null)}
          onDelete={() => handleDelete(openCompany.id)}
          contacts={contacts.filter((co) => co.company_id === openCompany.id)}
          deals={deals.filter((d) => d.company_id === openCompany.id)}
          owner={lookups.userById[openCompany.owner_id]}
        />
      )}
      {showAdd && (
        <AddCompanyDrawer
          onClose={() => setShowAdd(false)}
          onCreated={() => { fetchAll(); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function CompanyDrawer({ company, onClose, onDelete, contacts, deals, owner }) {
  return (
    <Drawer
      open
      onClose={onClose}
      title={company.name}
      subtitle={company.industry ? `${company.industry} • ${company.location || ""}` : company.location}
      testid="company-drawer"
      footer={
        <div className="flex items-center justify-between">
          <button className="btn-danger btn-sm" onClick={onDelete} data-testid="company-delete-btn">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button className="btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" value={<StatusPill label={company.status || "—"} tone={STATUS_TONES[company.status] || STATUS_TONES.inactive} />} />
          <Field label="Employees" value={company.employees ?? "—"} />
          <Field label="Revenue" value={company.annual_revenue ? formatCurrencyFull(company.annual_revenue) : "—"} />
          <Field label="Owner" value={owner?.name || "—"} />
          <Field label="Website" value={company.website ? <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-slate-900 underline-offset-2 hover:underline inline-flex items-center gap-1"><Globe className="w-3 h-3" />{company.website.replace(/^https?:\/\//, "")}</a> : "—"} />
          <Field label="Location" value={company.location ? <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{company.location}</span> : "—"} />
        </div>
        {company.notes && (
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Notes</div>
            <p className="text-sm text-slate-700">{company.notes}</p>
          </div>
        )}
        <Section title={`Contacts (${contacts.length})`}>
          {contacts.length === 0 ? <p className="text-sm text-slate-500">No contacts yet.</p> : (
            <ul className="space-y-1.5">
              {contacts.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm border border-slate-100 rounded p-2">
                  <span className="font-medium text-slate-900">{c.first_name} {c.last_name}</span>
                  <span className="text-xs text-slate-500">{c.title || ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title={`Deals (${deals.length})`}>
          {deals.length === 0 ? <p className="text-sm text-slate-500">No deals yet.</p> : (
            <ul className="space-y-1.5">
              {deals.map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm border border-slate-100 rounded p-2">
                  <span className="font-medium text-slate-900 truncate">{d.name}</span>
                  <span className="text-xs text-slate-500 font-mono">{formatCurrency(d.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </Drawer>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">{title}</div>
      {children}
    </div>
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

function AddCompanyDrawer({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", industry: "", website: "", location: "", employees: "", status: "active", annual_revenue: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await http.post("/companies", {
        ...form,
        employees: form.employees ? Number(form.employees) : null,
        annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
      });
      toast.success("Company created");
      onCreated();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open onClose={onClose} title="New company" testid="add-company-drawer"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button className="btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary btn-sm" onClick={submit} disabled={saving} data-testid="add-company-submit">{saving ? "Saving…" : "Create"}</button>
        </div>
      }>
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="add-company-name" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Industry" value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} />
          <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={[
            { v: "active", l: "Active" }, { v: "prospect", l: "Prospect" }, { v: "churned", l: "Churned" }]} />
        </div>
        <Input label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
        <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Employees" type="number" value={form.employees} onChange={(v) => setForm({ ...form, employees: v })} />
          <Input label="Annual revenue ($)" type="number" value={form.annual_revenue} onChange={(v) => setForm({ ...form, annual_revenue: v })} />
        </div>
      </form>
    </Drawer>
  );
}

function Input({ label, value, onChange, type = "text", required, testid }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <input type={type} required={required} className="inp" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
