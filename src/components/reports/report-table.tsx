import type { ReactNode } from "react";

export function ReportTable({
  label,
  headers,
  rows,
}: {
  label: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div
      className="report-table-scroll overflow-x-auto"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table
        className="report-data-table w-full min-w-[640px] border-collapse text-left text-sm"
        aria-label={label}
      >
        <thead>
          <tr className="border-border text-text-secondary border-b bg-white/40 text-xs">
            {headers.map((header) => (
              <th
                scope="col"
                key={header}
                className="border-border border-b px-3 py-3 font-semibold whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border/60 divide-y">
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-blue-50/30">
              {row.map((cell, i) => (
                <td
                  key={i}
                  className={`px-3 py-3 align-top ${typeof cell === "number" && i > 1 ? "text-text-primary font-bold tabular-nums" : "text-text-secondary"}`}
                >
                  {cell ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
