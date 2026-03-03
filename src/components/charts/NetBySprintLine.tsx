import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Dot,
  Line,
  LineChart,
  ReferenceLine,
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

type TimelineRow = SprintMetricsRow & {
  cumulativeNet: number;
};

function CustomDot(props: { cx?: number; cy?: number; payload?: SprintMetricsRow }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) {
    return null;
  }

  const color = payload.net >= 0 ? '#10b981' : '#ef4444';
  return <Dot cx={cx} cy={cy} r={3} fill={color} stroke="#ffffff" strokeWidth={2} />;
}

function TimelineTooltip({
  active,
  payload,
  label,
  showCumulative,
}: {
  active?: boolean;
  payload?: Array<{ payload: TimelineRow }>;
  label?: string;
  showCumulative: boolean;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0].payload;
  return (
    <div className="min-w-56 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-md">
      <p className="mb-2 border-b border-slate-100 pb-1 font-semibold text-slate-800">Sprint: {formatSprintFull(label || row.sprintName)}</p>
      <div className="space-y-1">
        <p className="flex justify-between gap-4"><span>Created</span><span className="font-semibold">{row.created}</span></p>
        <p className="flex justify-between gap-4"><span>Closed</span><span className="font-semibold">{row.closed}</span></p>
        <p className="flex justify-between gap-4"><span>Net</span><span className="font-semibold">{row.net}</span></p>
        {showCumulative ? (
          <p className="flex justify-between gap-4"><span>Cumulative</span><span className="font-semibold">{row.cumulativeNet}</span></p>
        ) : null}
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

export function NetBySprintLine({
  data,
  emptyMessage = 'No data available for selected sprint range',
  diagnostic,
}: Props) {
  const [useCumulative, setUseCumulative] = useState(false);
  const timelineData = useMemo<TimelineRow[]>(() => {
    let cumulative = 0;
    return data.map((row) => {
      cumulative += row.net;
      return { ...row, cumulativeNet: cumulative };
    });
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-80 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Net by Sprint</h3>
        <EmptyState message={emptyMessage} diagnostic={diagnostic} />
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="h-80 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Net by Sprint</h3>
        <EmptyState message="Add more sprints to see a timeline" diagnostic={diagnostic} />
      </div>
    );
  }

  const tickInterval = timelineData.length > 10 ? 1 : 0;

  return (
    <div className="h-80 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Net by Sprint</h3>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={useCumulative}
            onChange={(event) => setUseCumulative(event.target.checked)}
          />
          Cumulative net
        </label>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={timelineData} margin={{ top: 10, right: 24, left: 8, bottom: 56 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
          <XAxis
            dataKey="sprintName"
            tickFormatter={formatSprintLabel}
            tick={{ fontSize: 12 }}
            angle={-35}
            textAnchor="end"
            height={60}
            interval={tickInterval}
          />
          <YAxis allowDecimals={false} domain={['auto', 'auto']} />
          <Tooltip content={<TimelineTooltip showCumulative={useCumulative} />} />
          <Line
            type="monotone"
            dataKey={useCumulative ? 'cumulativeNet' : 'net'}
            stroke={useCumulative ? '#7c3aed' : '#0ea5e9'}
            strokeWidth={3}
            dot={<CustomDot />}
            activeDot={{ r: 6 }}
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
