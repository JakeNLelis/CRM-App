import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  CircleDollarSign,
  Activity,
  Workflow,
  Settings as SettingsIcon,
  Search,
  Plus,
  LogOut,
  Bell,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { initials } from "../../lib/utils";

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/app/companies", label: "Companies", icon: Building2, testid: "nav-companies" },
  { to: "/app/contacts", label: "Contacts", icon: Users, testid: "nav-contacts" },
  { to: "/app/deals", label: "Deals", icon: CircleDollarSign, testid: "nav-deals" },
  { to: "/app/activities", label: "Activities", icon: Activity, testid: "nav-activities" },
  { to: "/app/automations", label: "Automations", icon: Workflow, testid: "nav-automations" },
  { to: "/app/settings", label: "Settings", icon: SettingsIcon, testid: "nav-settings" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="app-shell-grid bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex bg-white border-r border-slate-200 flex-col" data-testid="app-sidebar">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-200">
          <span className="logo-mark">F</span>
          <span className="font-display font-semibold text-[15px] tracking-tight text-slate-900">FlowCRM</span>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
              data-testid={item.testid}
            >
              <item.icon className="nav-item-icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 px-1">Workspace</div>
          <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-slate-50">
            <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center text-xs font-bold">A</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">Acme Corp</div>
              <div className="text-xs text-slate-500 truncate">Sales workspace</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 gap-4" data-testid="app-topbar">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search deals, contacts, companies…"
                className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-2 text-sm placeholder:text-slate-400 fr-ring"
                data-testid="global-search"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-ghost relative" data-testid="notifications-btn">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-slate-50 fr-ring"
                data-testid="user-menu-button"
              >
                <span
                  className="avatar"
                  style={{ background: user?.avatar_color || "#0f172a" }}
                >
                  {initials(user?.name || user?.email || "?")}
                </span>
                <span className="hidden sm:block text-sm font-medium text-slate-900 max-w-[140px] truncate">
                  {user?.name || user?.email}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-ring py-1 z-50 animate-fadeIn" data-testid="user-menu">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-sm font-semibold text-slate-900 truncate">{user?.name}</div>
                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); navigate("/app/settings"); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    data-testid="user-menu-settings"
                  >
                    <SettingsIcon className="w-4 h-4" /> Settings
                  </button>
                  <button
                    onClick={async () => { setMenuOpen(false); await logout(); navigate("/login"); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-rose-700 flex items-center gap-2"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
