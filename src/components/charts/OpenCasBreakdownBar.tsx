import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OpenCasBreakdownRow } from '../../metrics/openCasAging';

interface Props {
  data: OpenCasBreakdownRow[];
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: OpenCasBreakdownRow; value: number }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <p className="mb-1 font-semibold text-slate-200">{row.scope}</p>
      <p>
        Bugs abiertos: <span className="font-semibold">{row.open}</span>
      </p>
    </div>
  );
}

export function OpenCasBreakdownBar({ data }: Props) {
  const totalOpen = data.reduce((acc, row) => acc + row.open, 0);
  const maxOpen = Math.max(...data.map((row) => row.open), 0);
  const yAxisTop = maxOpen > 0 ? maxOpen + Math.max(1, Math.ceil(maxOpen * 0.15)) : 5;

  return (
    <div className="h-72 rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Open Bugs: CAS vs CBU</h3>
        <p className="text-xs text-slate-500">Open total: {totalOpen}</p>
      </div>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart data={data} margin={{ left: 8, right: 14, top: 14, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.16} />
          <XAxis dataKey="scope" />
          <YAxis allowDecimals={false} domain={[0, yAxisTop]} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="open" fill="#0e7490" radius={[8, 8, 0, 0]} animationDuration={700}>
            <LabelList dataKey="open" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
