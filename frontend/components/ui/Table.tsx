import React from "react";

export const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-colors">
    <table className="w-full text-left text-sm text-slate-800 dark:text-slate-300">{children}</table>
  </div>
);

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-700 dark:bg-slate-950 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
    {children}
  </thead>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{children}</tbody>
);

export const TableRow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${className}`}>
    {children}
  </tr>
);

export const TableCell: React.FC<{
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}> = ({ children, className = "", colSpan }) => (
  <td colSpan={colSpan} className={`px-4 py-3 ${className}`}>
    {children}
  </td>
);
