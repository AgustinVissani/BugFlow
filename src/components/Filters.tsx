import type { BugCategory } from '../types';

export interface FilterState {
  sprintFrom: string;
  sprintTo: string;
  searchText: string;
  dev: string;
  category: BugCategory | 'ALL';
}

interface FiltersProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  sprintNames: string[];
  devNames: string[];
  categories: BugCategory[];
  sprintDisabled: boolean;
}

export function Filters({
  filters,
  onChange,
  sprintNames,
  devNames,
  categories,
  sprintDisabled,
}: FiltersProps) {
  return (
    <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm md:grid-cols-5">
      <label className="text-xs text-slate-600">
        Sprint from
        <select
          value={filters.sprintFrom}
          disabled={sprintDisabled}
          onChange={(event) => onChange({ ...filters, sprintFrom: event.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
        >
          <option value="">All</option>
          {sprintNames.map((sprint) => (
            <option key={sprint} value={sprint}>
              {sprint}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600">
        Sprint to
        <select
          value={filters.sprintTo}
          disabled={sprintDisabled}
          onChange={(event) => onChange({ ...filters, sprintTo: event.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
        >
          <option value="">All</option>
          {sprintNames.map((sprint) => (
            <option key={sprint} value={sprint}>
              {sprint}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600">
        Search text
        <input
          value={filters.searchText}
          onChange={(event) => onChange({ ...filters, searchText: event.target.value })}
          placeholder="title / tags / area"
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </label>
      <label className="text-xs text-slate-600">
        Dev
        <select
          value={filters.dev}
          onChange={(event) => onChange({ ...filters, dev: event.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="ALL">All</option>
          {devNames.map((dev) => (
            <option key={dev} value={dev}>
              {dev}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-600">
        Category
        <select
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value as BugCategory | 'ALL' })}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        >
          <option value="ALL">All</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
