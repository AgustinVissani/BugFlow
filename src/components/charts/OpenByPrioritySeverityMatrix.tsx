import type { OpenByPrioritySeverityResult } from '../../metrics/openByPrioritySeverity';

interface Props {
  result: OpenByPrioritySeverityResult;
}

function cellTone(count: number, maxValue: number): string {
  if (count <= 0 || maxValue <= 0) {
    return 'rgba(148, 163, 184, 0.12)';
  }
  const ratio = count / maxValue;
  const alpha = 0.22 + ratio * 0.58;
  return `rgba(8, 145, 178, ${alpha.toFixed(3)})`;
}

export function OpenByPrioritySeverityMatrix({ result }: Props) {
  if (result.totalOpen === 0 || result.rows.length === 0 || result.severities.length === 0) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Open bugs by Priority and Severity</h3>
        <div className="flex h-48 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">
          No open bugs available for priority/severity view
        </div>
      </div>
    );
  }

  const maxCellValue = Math.max(...result.rows.flatMap((row) => result.severities.map((severity) => row.severityCounts[severity] ?? 0)));
  const maxRowTotal = Math.max(...result.rows.map((row) => row.total), 1);

  return (
    <div className="rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700">Open bugs by Priority and Severity</h3>
        <p className="text-xs text-slate-500">Open total: {result.totalOpen}</p>
      </div>

      <div className="mb-4 grid gap-2">
        {result.rows.map((row) => (
          <div key={row.priority} className="grid grid-cols-[minmax(110px,190px)_1fr_auto] items-center gap-2">
            <p className="truncate text-xs text-slate-700">{row.priority}</p>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-cyan-600"
                style={{ width: `${Math.max(6, Math.round((row.total / maxRowTotal) * 100))}%` }}
              />
            </div>
            <p className="w-8 text-right text-xs font-semibold text-slate-800">{row.total}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-2 py-2 text-left font-semibold">Priority \\ Severity</th>
              {result.severities.map((severity) => (
                <th key={severity} className="px-2 py-2 text-center font-semibold">
                  {severity}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.priority} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-2 py-2 font-medium text-slate-700">{row.priority}</td>
                {result.severities.map((severity) => {
                  const value = row.severityCounts[severity] ?? 0;
                  return (
                    <td
                      key={`${row.priority}-${severity}`}
                      className="px-2 py-2 text-center font-semibold text-slate-900"
                      style={{ backgroundColor: cellTone(value, maxCellValue) }}
                    >
                      {value}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center font-semibold text-slate-800">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
