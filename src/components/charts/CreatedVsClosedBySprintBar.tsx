import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SprintMetricsRow } from '../../types';
import { formatSprintFull, formatSprintLabel } from '../../utils/formatSprint';

interface ChartDiagnostic {
  totalBugs: number;
  bugsWithCreatedDate: number;
  bugsWithClosedDate: number;
  calendarValidRows: number;
  bugDateRange: string;
  calendarDateRange: string;
}

interface Props {
  data: SprintMetricsRow[];
  emptyMessage?: string;
  diagnostic?: ChartDiagnostic;
}

function CreatedClosedTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: SprintMetricsRow; value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0].payload;
  return (
    <div className="min-w-52 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-md">
      <p className="mb-2 border-b border-slate-100 pb-1 font-semibold text-slate-800">Sprint: {formatSprintFull(label || row.sprintName)}</p>
      <div className="space-y-1">
        <p className="flex justify-between gap-4"><span>Created</span><span className="font-semibold">{row.created}</span></p>
        <p className="flex justify-between gap-4"><span>Closed</span><span className="font-semibold">{row.closed}</span></p>
        <p className="flex justify-between gap-4"><span>Net</span><span className="font-semibold">{row.net}</span></p>
      </div>
    </div>
  );
}

function EmptyState({ message, diagnostic }: { message: string; diagnostic?: ChartDiagnostic }) {
  return (
    <div className="flex h-[88%] flex-col items-center justify-center gap-2 rounded-lg bg-slate-50 px-4 text-center">
      <p className="text-sm text-slate-600">{message}</p>
      {diagnostic ? (
        <div className="w-full max-w-xl rounded-md border border-slate-200 bg-white p-2 text-left text-xs text-slate-600">
          <p>totalBugs: {diagnostic.totalBugs}</p>
          <p>bugsWithCreatedDate: {diagnostic.bugsWithCreatedDate}</p>
          <p>bugsWithClosedDate: {diagnostic.bugsWithClosedDate}</p>
          <p>calendarValidRows: {diagnostic.calendarValidRows}</p>
          <p>bugDateRange: {diagnostic.bugDateRange}</p>
          <p>calendarDateRange: {diagnostic.calendarDateRange}</p>
        </div>
      ) : null}
    </div>
  );
}

export function CreatedVsClosedBySprintBar({
  data,
  emptyMessage = 'No data available for selected sprint range',
  diagnostic,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="h-80 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Created vs Closed by Sprint</h3>
        <EmptyState message={emptyMessage} diagnostic={diagnostic} />
      </div>
    );
  }

  const tickInterval = data.length > 10 ? 1 : 0;

  return (
    <div className="h-80 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Created vs Closed by Sprint</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 56 }} barSize={20}>
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
          <Tooltip content={<CreatedClosedTooltip />} />
          <Legend verticalAlign="top" height={24} />
          <Bar dataKey="created" fill="#3b82f6" name="Created" radius={[6, 6, 0, 0]} animationDuration={650}>
            <LabelList dataKey="created" position="top" formatter={(value) => (Number(value ?? 0) > 0 ? value : '')} />
          </Bar>
          <Bar dataKey="closed" fill="#10b981" name="Closed" radius={[6, 6, 0, 0]} animationDuration={650}>
            <LabelList dataKey="closed" position="top" formatter={(value) => (Number(value ?? 0) > 0 ? value : '')} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
