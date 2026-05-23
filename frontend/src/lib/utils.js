import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n) {
  if (n == null || isNaN(n)) return "$0";
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(1)}k`;
  return `$${num.toFixed(0)}`;
}

export function formatCurrencyFull(n) {
  if (n == null || isNaN(n)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n));
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function relativeDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diffMs = d.getTime() - Date.now();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
    if (Math.abs(diffDays) < 365) return rtf.format(Math.round(diffDays / 30), "month");
    return rtf.format(Math.round(diffDays / 365), "year");
  } catch {
    return "—";
  }
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export const STAGES = [
  { id: "new_lead", name: "New Lead", color: "slate", tone: "bg-slate-50 text-slate-700 border-slate-200" },
  { id: "qualified", name: "Qualified", color: "blue", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "proposal", name: "Proposal Sent", color: "amber", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "negotiation", name: "Negotiation", color: "violet", tone: "bg-violet-50 text-violet-700 border-violet-200" },
  { id: "closed_won", name: "Closed Won", color: "emerald", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "closed_lost", name: "Closed Lost", color: "rose", tone: "bg-rose-50 text-rose-700 border-rose-200" },
];

export function stageById(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}

export const PRIORITIES = [
  { id: "low", name: "Low", tone: "bg-slate-50 text-slate-600 border-slate-200" },
  { id: "medium", name: "Medium", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "high", name: "High", tone: "bg-rose-50 text-rose-700 border-rose-200" },
];

export const STATUS_TONES = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  prospect: "bg-amber-50 text-amber-700 border-amber-200",
  churned: "bg-rose-50 text-rose-700 border-rose-200",
  inactive: "bg-slate-50 text-slate-600 border-slate-200",
  lead: "bg-blue-50 text-blue-700 border-blue-200",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-rose-50 text-rose-700 border-rose-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
};
