import React from "react";

export default function PageHeader({ title, description, children, testid }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 px-6 md:px-8 pt-8 pb-6" data-testid={testid}>
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-medium tracking-tight text-slate-900" data-testid={`${testid}-title`}>{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
