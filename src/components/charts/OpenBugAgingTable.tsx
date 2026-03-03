import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import type { OpenBugAgingRow } from '../../metrics/openCasAging';

interface Props {
  rows: OpenBugAgingRow[];
}

type SortKey =
  | 'id'
  | 'origin'
  | 'state'
  | 'sprint'
  | 'priority'
  | 'severity'
  | 'createdDate'
  | 'daysOpen'
  | 'createdBy'
  | 'assignedTo'
  | 'title';

type SortDirection = 'asc' | 'desc';
type ScopeFilter = 'ALL' | 'CAS' | 'NO_CAS';
type ColumnKey =
  | 'id'
  | 'origin'
  | 'state'
  | 'sprint'
  | 'priority'
  | 'severity'
  | 'createdDate'
  | 'daysOpen'
  | 'createdBy'
  | 'assignedTo'
  | 'title';

interface ColumnDef {
  key: ColumnKey;
  label: string;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'origin', label: 'Origin' },
  { key: 'state', label: 'State' },
  { key: 'sprint', label: 'Sprint' },
  { key: 'priority', label: 'Priority' },
  { key: 'severity', label: 'Severity' },
  { key: 'createdDate', label: 'Created' },
  { key: 'daysOpen', label: 'Days Open' },
  { key: 'createdBy', label: 'Created By' },
  { key: 'assignedTo', label: 'Assigned To' },
  { key: 'title', label: 'Title' },
];

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  id: true,
  origin: true,
  state: true,
  sprint: true,
  priority: true,
  severity: true,
  createdDate: true,
  daysOpen: true,
  createdBy: true,
  assignedTo: true,
  title: true,
};

function formatDate(value: Date | null): string {
  if (!value) {
    return '-';
  }
  return format(value, 'yyyy-MM-dd');
}

function formatDays(value: number | null): string {
  if (value === null) {
    return '-';
  }
  return `${value}d`;
}

function cleanPersonName(value: string): string {
  let text = value.trim();
  text = text.replace(/<[^>]*>/g, '').trim();
  text = text.replace(/\(([^)]*@[^)]*)\)/g, '').trim();
  text = text.replace(/\s+/g, ' ').trim();
  return text || 'Unassigned';
}

export function OpenBugAgingTable({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('daysOpen');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);

  const filteredRows = useMemo(() => {
    if (scopeFilter === 'ALL') {
      return rows;
    }
    if (scopeFilter === 'CAS') {
      return rows.filter((row) => row.isCas);
    }
    return rows.filter((row) => !row.isCas);
  }, [rows, scopeFilter]);

  const sortedRows = useMemo(() => {
    const next = [...filteredRows];
    next.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;

      const compareText = (left: string, right: string) => left.localeCompare(right) * direction;
      const compareNumber = (left: number, right: number) => (left - right) * direction;

      switch (sortKey) {
        case 'id':
          return compareText(a.id, b.id);
        case 'origin':
          return compareText(a.origin, b.origin);
        case 'state':
          return compareText(a.state, b.state);
        case 'sprint':
          return compareText(a.sprint, b.sprint);
        case 'priority':
          return compareText(a.priority, b.priority);
        case 'severity':
          return compareText(a.severity, b.severity);
        case 'createdDate':
          return compareNumber(a.createdDate?.getTime() ?? 0, b.createdDate?.getTime() ?? 0);
        case 'daysOpen':
          return compareNumber(a.daysOpen ?? -1, b.daysOpen ?? -1);
        case 'createdBy':
          return compareText(cleanPersonName(a.createdBy), cleanPersonName(b.createdBy));
        case 'assignedTo':
          return compareText(cleanPersonName(a.assignedTo), cleanPersonName(b.assignedTo));
        case 'title':
          return compareText(a.title, b.title);
        default:
          return 0;
      }
    });
    return next;
  }, [filteredRows, sortKey, sortDirection]);

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'daysOpen' ? 'desc' : 'asc');
  };

  const sortMark = (key: SortKey) => {
    if (sortKey !== key) {
      return '';
    }
    return sortDirection === 'asc' ? ' ^' : ' v';
  };

  const headerClass = 'px-2 py-2 text-left font-semibold cursor-pointer select-none hover:bg-slate-200/70';
  const cellClass = 'whitespace-nowrap px-2 py-2';

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Open Bug Aging (oldest first)</h3>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-600">
            Filter
            <select
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
              className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="ALL">All</option>
              <option value="CAS">CAS</option>
              <option value="NO_CAS">CBU</option>
            </select>
          </label>
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer rounded-md border border-slate-300 px-2 py-1">Columns</summary>
            <div className="mt-2 grid min-w-44 gap-1 rounded-md border border-slate-200 bg-white p-2 shadow-sm">
              {COLUMN_DEFS.map((column) => (
                <label key={column.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column.key]}
                    onChange={() => toggleColumn(column.key)}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </details>
          <p className="text-xs text-slate-500">{sortedRows.length} rows</p>
        </div>
      </div>

      {sortedRows.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
          No open bugs for selected filter
        </div>
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-700">
              <tr>
                {visibleColumns.id ? <th className={headerClass} onClick={() => onSort('id')}>ID{sortMark('id')}</th> : null}
                {visibleColumns.origin ? <th className={headerClass} onClick={() => onSort('origin')}>Origin{sortMark('origin')}</th> : null}
                {visibleColumns.state ? <th className={headerClass} onClick={() => onSort('state')}>State{sortMark('state')}</th> : null}
                {visibleColumns.sprint ? <th className={headerClass} onClick={() => onSort('sprint')}>Sprint{sortMark('sprint')}</th> : null}
                {visibleColumns.priority ? <th className={headerClass} onClick={() => onSort('priority')}>Priority{sortMark('priority')}</th> : null}
                {visibleColumns.severity ? <th className={headerClass} onClick={() => onSort('severity')}>Severity{sortMark('severity')}</th> : null}
                {visibleColumns.createdDate ? <th className={headerClass} onClick={() => onSort('createdDate')}>Created{sortMark('createdDate')}</th> : null}
                {visibleColumns.daysOpen ? <th className={headerClass} onClick={() => onSort('daysOpen')}>Days Open{sortMark('daysOpen')}</th> : null}
                {visibleColumns.createdBy ? <th className={headerClass} onClick={() => onSort('createdBy')}>Created By{sortMark('createdBy')}</th> : null}
                {visibleColumns.assignedTo ? <th className={headerClass} onClick={() => onSort('assignedTo')}>Assigned To{sortMark('assignedTo')}</th> : null}
                {visibleColumns.title ? <th className={headerClass} onClick={() => onSort('title')}>Title{sortMark('title')}</th> : null}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  {visibleColumns.id ? <td className={`${cellClass} font-medium text-slate-800`}>{row.id}</td> : null}
                  {visibleColumns.origin ? <td className={cellClass}>{row.origin}</td> : null}
                  {visibleColumns.state ? <td className={cellClass}>{row.state}</td> : null}
                  {visibleColumns.sprint ? <td className={cellClass}>{row.sprint}</td> : null}
                  {visibleColumns.priority ? <td className={cellClass}>{row.priority}</td> : null}
                  {visibleColumns.severity ? <td className={cellClass}>{row.severity}</td> : null}
                  {visibleColumns.createdDate ? <td className={cellClass}>{formatDate(row.createdDate)}</td> : null}
                  {visibleColumns.daysOpen ? <td className={`${cellClass} font-semibold text-slate-900`}>{formatDays(row.daysOpen)}</td> : null}
                  {visibleColumns.createdBy ? <td className={cellClass}>{cleanPersonName(row.createdBy)}</td> : null}
                  {visibleColumns.assignedTo ? <td className={cellClass}>{cleanPersonName(row.assignedTo)}</td> : null}
                  {visibleColumns.title ? <td className="px-2 py-2 text-slate-700">{row.title}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
