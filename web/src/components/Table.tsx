import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  label: ReactNode;
  render: (row: T, index: number) => ReactNode;
  align?: "left" | "right";
  width?: string;
};

export type TableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  isRowMuted?: (row: T, index: number) => boolean;
  rowTitle?: (row: T) => string | undefined;
  empty?: ReactNode;
};

/** Tableau à colonnes typées, ligne cliquable et ligne grisée optionnelles. */
export function Table<T>({ columns, rows, rowKey, onRowClick, isRowMuted, rowTitle, empty }: TableProps<T>) {
  if (rows.length === 0) {
    return <div className="table-empty">{empty ?? "Aucune ligne"}</div>;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.align === "right" ? "num" : undefined} style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const clickable = Boolean(onRowClick);
            const muted = isRowMuted?.(row, i) ?? false;
            const cls = [clickable ? "table-row-click" : "", muted ? "table-row-muted" : ""].filter(Boolean).join(" ");
            return (
              <tr
                key={rowKey(row, i)}
                className={cls || undefined}
                title={rowTitle?.(row)}
                onClick={clickable ? () => onRowClick?.(row, i) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick?.(row, i);
                        }
                      }
                    : undefined
                }
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? "button" : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.align === "right" ? "num" : undefined}>
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
