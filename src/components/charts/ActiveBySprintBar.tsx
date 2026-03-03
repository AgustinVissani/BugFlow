import { format } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatSprintFull, formatSprintLabel } from '../../utils/formatSprint';
import type { ActiveBySprintRow, ActiveMode } from '../../metrics/activeBySprint';

interface Props {
  data: ActiveBySprintRow[];
  mode: ActiveMode;
  asOfDate: Date;
  emptyMessage?: string;
}

function ActiveTooltip({
  active,
  payload,
  label,
  mode,
  asOfDate,
}: {
  active?: boolean;
  payload?: Array<{ payload: ActiveBySprintRow }>;
  label?: string;
  mode: ActiveMode;
  asOfDate: Date;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0].payload;
  return (
    <div className="min-w-52 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-md">
      <p className="mb-2 border-b border-slate-100 pb-1 font-semibold text-slate-800">Sprint: {formatSprintFull(label || row.sprintName)}</p>
      <p className="flex justify-between gap-4"><span>Active bugs</span><span className="font-semibold">{row.active}</span></p>
      <p className="mt-1 text-slate-500">Mode: {mode === 'current' ? 'Current sprint' : 'Created sprint'}</p>
      {mode === 'current' ? <p className="text-slate-500">As of: {format(asOfDate, 'yyyy-MM-dd')}</p> : null}
    </div>
  );
}

export function ActiveBySprintBar({ data, mode, asOfDate, emptyMessage = 'SprintCalendar required to display this chart' }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-80 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Active Bugs by Sprint</h3>
        <div className="flex h-[88%] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">{emptyMessage}</div>
      </div>
    );
  }

  const tickInterval = data.length > 10 ? 1 : 0;

  return (
    <div className="h-80 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Active Bugs by Sprint</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 56 }}>
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
          <YAxis allowDecimals={false} domain={[0, 'dataMax + 2']} />
          <Tooltip content={<ActiveTooltip mode={mode} asOfDate={asOfDate} />} />
          <Bar dataKey="active" fill="#f59e0b" radius={[6, 6, 0, 0]} animationDuration={650} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
