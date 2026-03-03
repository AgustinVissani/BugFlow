import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatSprintFull, formatSprintLabel } from '../../utils/formatSprint';
import type { OpenBySprintStateRow } from '../../metrics/openBySprintState';

interface Props {
  rows: OpenBySprintStateRow[];
  states: string[];
  emptyMessage?: string;
}

type ChartRow = {
  sprintName: string;
  [state: string]: string | number;
};

const PALETTE = ['#3b82f6', '#f59e0b', '#14b8a6', '#8b5cf6', '#ef4444', '#22c55e', '#eab308', '#06b6d4', '#64748b'];

function OpenStateTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="min-w-56 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-md">
      <p className="mb-2 border-b border-slate-100 pb-1 font-semibold text-slate-800">Sprint: {formatSprintFull(label || '')}</p>
      <div className="space-y-1">
        {payload
          .filter((entry) => Number(entry.value) > 0)
          .map((entry) => (
            <p key={entry.name} className="flex justify-between gap-4">
              <span>{entry.name}</span>
              <span className="font-semibold">{entry.value}</span>
            </p>
          ))}
      </div>
    </div>
  );
}

export function OpenBySprintStateBar({ rows, states, emptyMessage = 'SprintCalendar required to display this chart' }: Props) {
  if (rows.length === 0 || states.length === 0) {
    return (
      <div className="h-[340px] rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Open bugs by Sprint State (excluding Closed)</h3>
        <div className="flex h-[88%] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">{emptyMessage}</div>
      </div>
    );
  }

  const tickInterval = rows.length > 10 ? 1 : 0;
  const chartData: ChartRow[] = rows.map((row) => {
    const flat: ChartRow = { sprintName: row.sprintName };
    states.forEach((state) => {
      flat[state] = row.stateCounts[state] || 0;
    });
    return flat;
  });

  return (
    <div className="h-[340px] rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Open bugs by Sprint State (excluding Closed)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 24, left: 8, bottom: 56 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="sprintName"
            tickFormatter={formatSprintLabel}
            tick={{ fontSize: 12 }}
            angle={-35}
            textAnchor="end"
            height={60}
            interval={tickInterval}
          />
          <YAxis allowDecimals={false} />
          <Tooltip content={<OpenStateTooltip />} />
          <Legend verticalAlign="top" height={28} />
          {states.map((state, index) => (
            <Bar
              key={state}
              dataKey={state}
              stackId="states"
              fill={PALETTE[index % PALETTE.length]}
              animationDuration={650}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
