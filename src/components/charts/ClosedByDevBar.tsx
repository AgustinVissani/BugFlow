import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DevMetricsRow } from '../../types';

interface Props {
  data: DevMetricsRow[];
}

interface DevChartRow {
  dev: string;
  closed: number;
  percentOfClosed: number;
}

function DarkTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DevChartRow }> }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="mb-1 font-semibold text-slate-200">{row.dev}</p>
      <p>Bugs cerrados: <span className="font-semibold">{row.closed}</span></p>
      <p>% del total: <span className="font-semibold">{row.percentOfClosed.toFixed(2)}%</span></p>
    </div>
  );
}

export function ClosedByDevBar({ data }: Props) {
  const chartData = useMemo<DevChartRow[]>(() => {
    if (data.length <= 10) {
      return [...data].sort((a, b) => b.closed - a.closed);
    }

    const sorted = [...data].sort((a, b) => b.closed - a.closed);
    const top10 = sorted.slice(0, 10);
    const rest = sorted.slice(10);
    const restClosed = rest.reduce((acc, row) => acc + row.closed, 0);
    const restPercent = rest.reduce((acc, row) => acc + row.percentOfClosed, 0);

    return [...top10, { dev: 'Others', closed: restClosed, percentOfClosed: Number(restPercent.toFixed(2)) }];
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-80 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Closed by Dev</h3>
        <div className="flex h-[88%] items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">No closed bugs found</div>
      </div>
    );
  }

  return (
    <div className="h-80 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Closed by Dev</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 22, right: 18, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis dataKey="dev" type="category" width={120} />
          <Tooltip content={<DarkTooltip />} />
          <Bar dataKey="closed" fill="#2563eb" radius={[0, 8, 8, 0]} animationDuration={650}>
            <LabelList
              dataKey="percentOfClosed"
              position="insideRight"
              fill="#ffffff"
              formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
