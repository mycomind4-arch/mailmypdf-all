import type { ReactNode } from "react";

export interface DataTableColumn {
  key: string;
  label: string;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  rows: Record<string, ReactNode>[];
}

/** Generic table used for Evidence map, Timeline coverage, Draft quality check. */
export function DataTable({ columns, rows }: DataTableProps) {
  return (
    <div className="wf-table-wrap">
      <table className="wf-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
