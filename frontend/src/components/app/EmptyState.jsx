import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ title, description, action, testid }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6" data-testid={testid}>
      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
        <Inbox className="w-5 h-5 text-slate-400" />
      </div>
      <h3 className="text-base font-display font-medium text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
