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
import type { CategoryMetricsRow } from '../../types';

interface Props {
  data: CategoryMetricsRow[];
}

function SmartLabel({ width, value }: { width?: number; value?: number }) {
  if (!width || width < 28 || !value) {
    return null;
  }
  return <tspan fill="#ffffff">{value}</tspan>;
}

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="mb-1 font-semibold text-slate-200">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name}>
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function CategoryStackedBar({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-[420px] rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Category Distribution</h3>
        <div className="flex h-[92%] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">No category data available</div>
      </div>
    );
  }

  return (
    <div className="h-[420px] rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Category Distribution</h3>
      <ResponsiveContainer width="100%" height="92%">
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 18, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="category" type="category" width={200} />
          <Tooltip content={<DarkTooltip />} />
          <Legend verticalAlign="top" align="center" />
          <Bar dataKey="open" stackId="a" fill="#ef4444" name="Open" animationDuration={700}>
            <LabelList dataKey="open" position="insideRight" content={<SmartLabel />} />
          </Bar>
          <Bar dataKey="closed" stackId="a" fill="#22c55e" name="Closed" animationDuration={700}>
            <LabelList dataKey="closed" position="insideRight" content={<SmartLabel />} />
          </Bar>
          <Bar dataKey="total" fill="#1e293b" name="Total" animationDuration={700}>
            <LabelList dataKey="total" position="insideRight" content={<SmartLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
