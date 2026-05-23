import React from "react";
import { X } from "lucide-react";

export default function Drawer({ open, onClose, title, subtitle, children, footer, testid }) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} data-testid={`${testid}-overlay`} />
      <div className="drawer-panel" data-testid={testid}>
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-lg font-display font-medium text-slate-900 tracking-tight truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-ghost" data-testid={`${testid}-close`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-slate-200 p-4 bg-slate-50/60">{footer}</div>}
      </div>
    </>
  );
}
