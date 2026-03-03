import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { useEffect, useMemo, useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { Filters, type FilterState } from './components/Filters';
import { ActiveBySprintBar } from './components/charts/ActiveBySprintBar';
import { CategoryStackedBar } from './components/charts/CategoryStackedBar';
import { ClosedByDevBar } from './components/charts/ClosedByDevBar';
import { CreatedVsClosedBySprintBar } from './components/charts/CreatedVsClosedBySprintBar';
import { NetBySprintLine } from './components/charts/NetBySprintLine';
import { OpenBugAgingTable } from './components/charts/OpenBugAgingTable';
import { OpenCasBreakdownBar } from './components/charts/OpenCasBreakdownBar';
import { OpenByPrioritySeverityMatrix } from './components/charts/OpenByPrioritySeverityMatrix';
import { OpenBySprintStateBar } from './components/charts/OpenBySprintStateBar';
import { computeActiveBySprint, type ActiveMode } from './metrics/activeBySprint';
import { computeCategoryMetrics } from './metrics/category';
import { computeDevMetrics } from './metrics/dev';
import { computeOpenCasAging } from './metrics/openCasAging';
import { computeOpenByPrioritySeverity } from './metrics/openByPrioritySeverity';
import { computeOpenBySprintState } from './metrics/openBySprintState';
import { computeSprintMetrics } from './metrics/sprint';
import { normalizeRows, parseDateRobust } from './parsers/normalize';
import { parseUnknownFile } from './parsers/parseJson';
import { extractSprintNumber } from './utils/formatSprint';
import type {
  BugCategory,
  BugNormalized,
  BugRowRaw,
  DashboardSummary,
  MetricsResult,
  SprintCalendarRow,
} from './types';

const CATEGORIES: BugCategory[] = [
  'Forecasting',
  'Libranzas',
  'BU Hora 00:00',
  'Turnos / Solapamientos',
  'Eliminar turnos / Borrar libranzas',
  'Ausencias',
  'Optimizador',
  'KPIs / Contadores',
  'Alertas',
  'Shift Finder',
  'CAS / Integraciones',
  'Others',
];

const INITIAL_FILTERS: FilterState = {
  sprintFrom: '',
  sprintTo: '',
  searchText: '',
  dev: 'ALL',
  category: 'ALL',
};
const DEFAULT_SPRINT_CALENDAR_JSON = `[
  {
    "SprintName": "2025 Sprint 23",
    "StartDate": "2025-11-12",
    "EndDate": "2025-11-25"
  },
  {
    "SprintName": "2025 Sprint 24",
    "StartDate": "2025-11-26",
    "EndDate": "2025-12-09"
  },
  {
    "SprintName": "2025 Sprint 25",
    "StartDate": "2025-12-10",
    "EndDate": "2025-12-18"
  },
  {
    "SprintName": "2025 Sprint 26 - Q1 Prep Week",
    "StartDate": "2025-12-24",
    "EndDate": "2025-12-30"
  },
  {
    "SprintName": "2026 Sprint 01",
    "StartDate": "2025-12-31",
    "EndDate": "2026-01-13"
  },
  {
    "SprintName": "2026 Sprint 02",
    "StartDate": "2026-01-14",
    "EndDate": "2026-01-27"
  },
  {
    "SprintName": "2026 Sprint 03",
    "StartDate": "2026-01-28",
    "EndDate": "2026-02-10"
  },
  {
    "SprintName": "2026 Sprint 04",
    "StartDate": "2026-02-11",
    "EndDate": "2026-02-24"
  },
  {
    "SprintName": "2026 Sprint 05",
    "StartDate": "2026-02-25",
    "EndDate": "2026-03-10"
  }
]`;

type ChartDiagnostic = {
  totalBugs: number;
  bugsWithCreatedDate: number;
  bugsWithClosedDate: number;
  calendarValidRows: number;
  bugDateRange: string;
  calendarDateRange: string;
};

function normalizeCalendarKey(value: string): string {
  return value.trim().toLowerCase();
}

function formatDate(date: Date | null): string {
  return date ? format(date, 'yyyy-MM-dd') : '-';
}

function formatDateRange(dates: Date[]): string {
  if (!dates.length) {
    return '-';
  }
  const min = new Date(Math.min(...dates.map((date) => date.getTime())));
  const max = new Date(Math.max(...dates.map((date) => date.getTime())));
  return `${formatDate(min)} to ${formatDate(max)}`;
}

function parseSprintCalendarRows(rawRows: BugRowRaw[]): { rows: SprintCalendarRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const rows: SprintCalendarRow[] = [];

  if (rawRows.length === 0) {
    return { rows: [], warnings: ['SprintCalendar is empty.'] };
  }

  const headerMap = new Map<string, string>();
  Object.keys(rawRows[0]).forEach((key) => {
    headerMap.set(normalizeCalendarKey(key), key);
  });

  const sprintKey = headerMap.get('sprintname') || null;
  const startKey = headerMap.get('startdate') || null;
  const endKey = headerMap.get('enddate') || null;

  if (!sprintKey) {
    warnings.push('Missing column SprintName');
  }
  if (!startKey) {
    warnings.push('Missing column StartDate');
  }
  if (!endKey) {
    warnings.push('Missing column EndDate');
  }

  if (!sprintKey || !startKey || !endKey) {
    return { rows: [], warnings };
  }

  const invalidExamples: string[] = [];
  let invalidCount = 0;

  rawRows.forEach((row, index) => {
    const sprintName = String(row[sprintKey] ?? '').trim();
    const startRaw = row[startKey];
    const endRaw = row[endKey];
    const startDate = parseDateRobust(startRaw);
    const endDate = parseDateRobust(endRaw);

    if (!sprintName) {
      invalidCount += 1;
      if (invalidExamples.length < 5) {
        invalidExamples.push(`Invalid SprintName at row ${index + 1}: value="${String(row[sprintKey] ?? '')}"`);
      }
      return;
    }

    if (!startDate || !endDate) {
      invalidCount += 1;
      if (invalidExamples.length < 5) {
        invalidExamples.push(
          `Invalid date at row ${index + 1}: StartDate="${String(startRaw ?? '')}", EndDate="${String(endRaw ?? '')}"`,
        );
      }
      return;
    }

    if (endDate < startDate) {
      invalidCount += 1;
      if (invalidExamples.length < 5) {
        invalidExamples.push(
          `Invalid range at row ${index + 1}: StartDate="${String(startRaw)}", EndDate="${String(endRaw)}"`,
        );
      }
      return;
    }

    rows.push({ sprintName, startDate, endDate });
  });

  if (invalidCount > 0) {
    warnings.push(`SprintCalendar invalid rows: ${invalidCount}/${rawRows.length}. ${invalidExamples.join(' | ')}`);
  }

  if (rows.length === 0) {
    warnings.push('SprintCalendar invalid: 0 valid rows after validation.');
  }

  return { rows, warnings };
}

function makeSummary(bugs: BugNormalized[]): DashboardSummary {
  const createdDates = bugs.map((bug) => bug.createdDate).filter((date): date is Date => date !== null);
  return {
    total: bugs.length,
    open: bugs.filter((bug) => !bug.isClosed).length,
    closed: bugs.filter((bug) => bug.isClosed).length,
    minCreatedDate: createdDates.length ? new Date(Math.min(...createdDates.map((date) => date.getTime()))) : null,
    maxCreatedDate: createdDates.length ? new Date(Math.max(...createdDates.map((date) => date.getTime()))) : null,
  };
}

function downloadBlob(filename: string, content: Blob) {
  const url = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toCsv<T>(rows: T[]): string {
  if (rows.length === 0) {
    return '';
  }
  const firstRow = rows[0] as Record<string, unknown>;
  const headers = Object.keys(firstRow);
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    const rowRecord = row as Record<string, unknown>;
    const values = headers.map((key) => {
      const raw = rowRecord[key];
      const text = raw === null || raw === undefined ? '' : String(raw);
      return `"${text.replace(/"/g, '""')}"`;
    });
    lines.push(values.join(','));
  });
  return lines.join('\n');
}

function parseInvalidRateFromWarnings(warnings: string[]): number {
  let maxRate = 0;
  warnings.forEach((warning) => {
    const match = warning.match(/Invalid (CreatedDate|ClosedDate): (\d+)\/(\d+)/);
    if (!match) {
      return;
    }
    const invalid = Number(match[2]);
    const total = Number(match[3]);
    if (!Number.isFinite(invalid) || !Number.isFinite(total) || total === 0) {
      return;
    }
    maxRate = Math.max(maxRate, (invalid / total) * 100);
  });
  return maxRate;
}

function SprintChartSkeleton() {
  return <div className="h-80 animate-pulse rounded-xl bg-slate-200/80" />;
}

function App() {
  const [bugs, setBugs] = useState<BugNormalized[]>([]);
  const [calendar, setCalendar] = useState<SprintCalendarRow[]>([]);
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);
  const [calendarWarnings, setCalendarWarnings] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [calendarJsonText, setCalendarJsonText] = useState(DEFAULT_SPRINT_CALENDAR_JSON);
  const [isSprintLoading, setIsSprintLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeMode, setActiveMode] = useState<ActiveMode>('current');
  const [asOfDateInput, setAsOfDateInput] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleBugFile = async (file: File) => {
    try {
      const rawRows = await parseUnknownFile(file);
      const normalized = normalizeRows(rawRows);
      setBugs(normalized.rows);
      setDataWarnings(normalized.warnings);
      setFilters(INITIAL_FILTERS);
    } catch (error) {
      setDataWarnings([`Failed to parse bugs file: ${(error as Error).message}`]);
      setBugs([]);
    }
  };

  const handleCalendarFile = async (file: File) => {
    try {
      const rawRows = await parseUnknownFile(file);
      const parsed = parseSprintCalendarRows(rawRows);
      setCalendar(parsed.rows);
      setCalendarWarnings(parsed.warnings);
      setFilters((prev) => ({ ...prev, sprintFrom: '', sprintTo: '' }));
    } catch (error) {
      setCalendar([]);
      setCalendarWarnings([`Failed to parse SprintCalendar file: ${(error as Error).message}`]);
    }
  };

  const handleCalendarJsonApply = () => {
    try {
      const parsedJson = JSON.parse(calendarJsonText) as unknown;
      const rows = Array.isArray(parsedJson)
        ? (parsedJson as BugRowRaw[])
        : (parsedJson as { data?: BugRowRaw[] }).data;

      if (!Array.isArray(rows)) {
        throw new Error('Expected JSON array or { data: [] }.');
      }

      const parsed = parseSprintCalendarRows(rows);
      setCalendar(parsed.rows);
      setCalendarWarnings(parsed.warnings);
      setFilters((prev) => ({ ...prev, sprintFrom: '', sprintTo: '' }));
    } catch (error) {
      setCalendar([]);
      setCalendarWarnings([`Failed to parse SprintCalendar JSON: ${(error as Error).message}`]);
    }
  };

  const filteredBugs = useMemo(() => {
    return bugs.filter((bug) => {
      const searchTarget = `${bug.title || ''} ${bug.tags || ''} ${bug.areaPath || ''}`.toLowerCase();
      const bugDev = bug.closedBy || bug.assignedTo || 'Unassigned';

      if (filters.searchText && !searchTarget.includes(filters.searchText.toLowerCase())) {
        return false;
      }
      if (filters.dev !== 'ALL' && bugDev !== filters.dev) {
        return false;
      }
      if (filters.category !== 'ALL' && bug.category !== filters.category) {
        return false;
      }

      return true;
    });
  }, [bugs, filters]);

  const summary = useMemo(() => makeSummary(filteredBugs), [filteredBugs]);

  const orderedCalendar = useMemo(
    () => [...calendar].sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [calendar],
  );
  const defaultFromIndex = useMemo(() => {
    const idx = orderedCalendar.findIndex((row) => {
      const number = extractSprintNumber(row.sprintName);
      return number !== null && number >= 23;
    });
    return idx >= 0 ? idx : 0;
  }, [orderedCalendar]);

  const sprintMetricsBase = useMemo(() => {
    if (!orderedCalendar.length) {
      return [];
    }
    return computeSprintMetrics(filteredBugs, orderedCalendar);
  }, [filteredBugs, orderedCalendar]);

  const sprintNames = useMemo(() => orderedCalendar.map((row) => row.sprintName), [orderedCalendar]);

  const sprintMetrics = useMemo(() => {
    if (!sprintMetricsBase.length) {
      return [];
    }

    let fromIndex = defaultFromIndex;
    let toIndex = sprintMetricsBase.length - 1;

    if (filters.sprintFrom) {
      const idx = sprintMetricsBase.findIndex((row) => row.sprintName === filters.sprintFrom);
      if (idx >= 0) {
        fromIndex = idx;
      }
    }

    if (filters.sprintTo) {
      const idx = sprintMetricsBase.findIndex((row) => row.sprintName === filters.sprintTo);
      if (idx >= 0) {
        toIndex = idx;
      }
    }

    if (toIndex < fromIndex) {
      return sprintMetricsBase;
    }

    return sprintMetricsBase.slice(fromIndex, toIndex + 1);
  }, [sprintMetricsBase, filters.sprintFrom, filters.sprintTo, defaultFromIndex]);

  const sprintAllZero = useMemo(
    () => sprintMetrics.length > 0 && sprintMetrics.every((row) => row.created === 0 && row.closed === 0 && row.net === 0),
    [sprintMetrics],
  );
  const netTimelineAllZero = useMemo(
    () =>
      sprintMetrics.length > 0 &&
      sprintMetrics.every((row) => row.created === 0 && row.closed === 0 && row.net === 0),
    [sprintMetrics],
  );

  useEffect(() => {
    if (!orderedCalendar.length) {
      setIsSprintLoading(false);
      return;
    }

    setIsSprintLoading(true);
    const timer = window.setTimeout(() => {
      setIsSprintLoading(false);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [orderedCalendar, filteredBugs, filters.sprintFrom, filters.sprintTo]);

  const devMetrics = useMemo(() => computeDevMetrics(filteredBugs), [filteredBugs]);
  const categoryMetrics = useMemo(() => computeCategoryMetrics(filteredBugs), [filteredBugs]);
  const openByStateResult = useMemo(
    () => computeOpenBySprintState(filteredBugs, orderedCalendar),
    [filteredBugs, orderedCalendar],
  );
  const openByPrioritySeverity = useMemo(
    () => computeOpenByPrioritySeverity(filteredBugs),
    [filteredBugs],
  );
  const asOfDate = useMemo(() => parseDateRobust(asOfDateInput) || new Date(), [asOfDateInput]);
  const activeBySprint = useMemo(
    () => computeActiveBySprint(filteredBugs, orderedCalendar, activeMode, asOfDate),
    [filteredBugs, orderedCalendar, activeMode, asOfDate],
  );
  const openCasAging = useMemo(
    () => computeOpenCasAging(filteredBugs, asOfDate),
    [filteredBugs, asOfDate],
  );

  const devNames = useMemo(() => {
    const values = filteredBugs.map((bug) => bug.closedBy || bug.assignedTo || 'Unassigned');
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [filteredBugs]);

  const mergedWarnings = useMemo(() => {
    const list = [...dataWarnings, ...calendarWarnings];
    if (!orderedCalendar.length) {
      list.push('SprintCalendar missing or invalid. Sprint metrics and sprint charts are disabled.');
    }
    return [...new Set(list)];
  }, [dataWarnings, calendarWarnings, orderedCalendar.length]);

  const invalidDateRate = useMemo(() => parseInvalidRateFromWarnings(dataWarnings), [dataWarnings]);
  const hasCriticalWarnings = invalidDateRate > 30;

  const sprintDiagnostic = useMemo<ChartDiagnostic>(() => {
    const bugsWithCreatedDate = filteredBugs.filter((bug) => bug.createdDate !== null).length;
    const bugsWithClosedDate = filteredBugs.filter((bug) => bug.closedDate !== null).length;
    const bugDates = filteredBugs
      .flatMap((bug) => [bug.createdDate, bug.closedDate])
      .filter((date): date is Date => date !== null);
    const calendarStarts = orderedCalendar.map((row) => row.startDate);
    const calendarEnds = orderedCalendar.map((row) => row.endDate);

    return {
      totalBugs: filteredBugs.length,
      bugsWithCreatedDate,
      bugsWithClosedDate,
      calendarValidRows: orderedCalendar.length,
      bugDateRange: formatDateRange(bugDates),
      calendarDateRange: formatDateRange([...calendarStarts, ...calendarEnds]),
    };
  }, [filteredBugs, orderedCalendar]);

  useEffect(() => {
    console.log({
      totalBugs: filteredBugs.length,
      bugsWithCreatedDate: sprintDiagnostic.bugsWithCreatedDate,
      bugsWithClosedDate: sprintDiagnostic.bugsWithClosedDate,
      calendarRows: calendar.length,
      validCalendarRows: orderedCalendar.length,
      sprintMetricsCount: sprintMetrics.length,
      bugMinCreated: summary.minCreatedDate ? formatDate(summary.minCreatedDate) : null,
      bugMaxCreated: summary.maxCreatedDate ? formatDate(summary.maxCreatedDate) : null,
      calendarMinStart: orderedCalendar.length ? formatDate(orderedCalendar[0].startDate) : null,
      calendarMaxEnd: orderedCalendar.length ? formatDate(orderedCalendar[orderedCalendar.length - 1].endDate) : null,
    });
  }, [filteredBugs.length, sprintDiagnostic, calendar.length, orderedCalendar, sprintMetrics.length, summary.minCreatedDate, summary.maxCreatedDate]);

  const metricsResult: MetricsResult = {
    summary,
    sprintMetrics,
    devMetrics,
    categoryMetrics,
    warnings: mergedWarnings,
  };

  const exportJson = () => {
    const payload = {
      ...metricsResult,
      summary: {
        ...metricsResult.summary,
        minCreatedDate: metricsResult.summary.minCreatedDate?.toISOString() ?? null,
        maxCreatedDate: metricsResult.summary.maxCreatedDate?.toISOString() ?? null,
      },
    };
    downloadBlob('metrics-result.json', new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  };

  const exportCsvZip = async () => {
    const zip = new JSZip();
    zip.file('sprint_metrics.csv', toCsv(sprintMetrics));
    zip.file('dev_metrics.csv', toCsv(devMetrics));
    zip.file(
      'open_priority_severity.csv',
      toCsv(
        openByPrioritySeverity.rows.flatMap((row) =>
          openByPrioritySeverity.severities.map((severity) => ({
            priority: row.priority,
            severity,
            open: row.severityCounts[severity] ?? 0,
          })),
        ),
      ),
    );
    zip.file('open_cas_breakdown.csv', toCsv(openCasAging.breakdown));
    zip.file(
      'open_bug_aging.csv',
      toCsv(
        openCasAging.rows.map((row) => ({
          id: row.id,
          origin: row.origin,
          casScope: row.isCas ? 'CAS' : 'CBU',
          createdByUs: row.isFoundByUs ? 'Yes' : 'No',
          state: row.state,
          sprint: row.sprint,
          priority: row.priority,
          severity: row.severity,
          createdDate: row.createdDate ? format(row.createdDate, 'yyyy-MM-dd') : '',
          daysOpen: row.daysOpen ?? '',
          createdBy: row.createdBy,
          assignedTo: row.assignedTo,
          title: row.title,
        })),
      ),
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob('metrics-export.zip', blob);
  };

  const exportDashboardToPdf = async () => {
    setIsExportingPdf(true);

    try {
      const sections = [
        'summary-cards',
        'chart-created-closed',
        'chart-net',
        'chart-dev',
        'chart-category',
        'chart-open-state',
        'chart-priority-severity',
        'chart-open-cas',
        'table-open-aging',
      ];

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      for (let index = 0; index < sections.length; index += 1) {
        if (index > 0) {
          pdf.addPage();
        }

        const element = document.getElementById(sections[index]);
        if (!element) {
          throw new Error(`Section not found: ${sections[index]}`);
        }

        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imageData = canvas.toDataURL('image/png');

        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;
        const ratio = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);

        const renderWidth = canvas.width * ratio;
        const renderHeight = canvas.height * ratio;
        const x = (pageWidth - renderWidth) / 2;

        pdf.addImage(imageData, 'PNG', x, margin, renderWidth, renderHeight);
      }

      pdf.save('bug-metrics-dashboard.pdf');
    } catch (error) {
      setDataWarnings((prev) => [...prev, `Failed to export PDF: ${(error as Error).message}`]);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const sprintNoDataMessage =
    'No bugs fall within sprint date ranges. Check bug date parsing or sprint date ranges.';
  const oneSprintTimelineMessage = 'Add more sprints to see a timeline';

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto flex max-w-7xl flex-col gap-5 p-4 md:p-7">
        <header className="rounded-2xl bg-gradient-to-r from-cyan-700 to-teal-700 p-6 text-white shadow-[0_12px_32px_rgba(15,23,42,0.18)]">
          <h1 className="text-2xl font-bold">Bug Metrics Dashboard</h1>
          <p className="mt-1 text-sm text-cyan-50">Import bugs, normalize columns, calculate metrics, and visualize sprint insights.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <FileUploader
              label="Bugs dataset"
              description="Upload .xlsx, .csv or .json exported from Azure DevOps / Jira"
              accepted=".xlsx,.xls,.csv,.json"
              onFileSelected={handleBugFile}
            />
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <FileUploader
              label="SprintCalendar file"
              description="Columns: SprintName, StartDate, EndDate"
              accepted=".xlsx,.xls,.csv,.json"
              onFileSelected={handleCalendarFile}
            />
            <label className="block text-xs text-slate-600">
              Paste SprintCalendar JSON
              <textarea
                value={calendarJsonText}
                onChange={(event) => setCalendarJsonText(event.target.value)}
                placeholder='[{"SprintName":"ALL RANGE","StartDate":"2025-01-01","EndDate":"2026-12-31"}]'
                className="mt-1 h-24 w-full rounded-md border border-slate-300 p-2 text-xs"
              />
            </label>
            <button
              type="button"
              onClick={handleCalendarJsonApply}
              disabled={isExportingPdf}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              Apply SprintCalendar JSON
            </button>
            {orderedCalendar.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-slate-200">
                <p className="bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">SprintCalendar preview</p>
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-2 py-1 text-left">SprintName</th>
                      <th className="px-2 py-1 text-left">StartDate</th>
                      <th className="px-2 py-1 text-left">EndDate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedCalendar.slice(0, 5).map((row) => (
                      <tr key={`${row.sprintName}-${row.startDate.toISOString()}`} className="border-t border-slate-100">
                        <td className="px-2 py-1">{row.sprintName}</td>
                        <td className="px-2 py-1">{formatDate(row.startDate)}</td>
                        <td className="px-2 py-1">{formatDate(row.endDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>

        <section id="summary-cards" className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <p className="text-xs text-slate-500">Total bugs</p>
            <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <p className="text-xs text-slate-500">Open</p>
            <p className="text-2xl font-bold text-orange-600">{summary.open}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <p className="text-xs text-slate-500">Closed</p>
            <p className="text-2xl font-bold text-emerald-600">{summary.closed}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <p className="text-xs text-slate-500">Created range</p>
            <p className="text-sm font-semibold text-slate-800">
              {formatDate(summary.minCreatedDate)} to {formatDate(summary.maxCreatedDate)}
            </p>
          </div>
        </section>

        {mergedWarnings.length > 0 ? (
          <section
            className={`rounded-xl border p-3 text-sm ${
              hasCriticalWarnings
                ? 'border-red-300 bg-red-50 text-red-900'
                : 'border-amber-300 bg-amber-50 text-amber-900'
            }`}
          >
            <p className="mb-1 font-semibold">Warnings</p>
            <ul className="list-disc space-y-1 pl-5">
              {mergedWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <details className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-800">Debug diagnostics</summary>
          <div className="mt-2 grid gap-1">
            <p>calendarValidRows: {orderedCalendar.length}</p>
            <p>bugDateRange: {sprintDiagnostic.bugDateRange}</p>
            <p>calendarDateRange: {sprintDiagnostic.calendarDateRange}</p>
            <p>bugsWithCreatedDate: {sprintDiagnostic.bugsWithCreatedDate}</p>
            <p>bugsWithClosedDate: {sprintDiagnostic.bugsWithClosedDate}</p>
            <p>sprintMetricsCount: {sprintMetricsBase.length}</p>
          </div>
        </details>

        <Filters
          filters={filters}
          onChange={setFilters}
          sprintNames={sprintNames}
          devNames={devNames}
          categories={CATEGORIES}
          sprintDisabled={!orderedCalendar.length}
        />

        <section className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportJson}
            disabled={isExportingPdf}
            className="rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-cyan-500"
          >
            Export metrics JSON
          </button>
          <button
            type="button"
            onClick={exportCsvZip}
            disabled={isExportingPdf}
            className="rounded-md bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-500"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportDashboardToPdf}
            disabled={isExportingPdf}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isExportingPdf ? 'Generating PDF...' : 'Export PDF'}
          </button>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-slate-600">
              Group active bugs by
              <select
                value={activeMode}
                onChange={(event) => setActiveMode(event.target.value as ActiveMode)}
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1 text-sm"
              >
                <option value="current">Current sprint</option>
                <option value="created">Created sprint</option>
              </select>
            </label>
            <label className="text-xs text-slate-600">
              As of date
              <input
                type="date"
                value={asOfDateInput}
                onChange={(event) => setAsOfDateInput(event.target.value)}
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1 text-sm"
                disabled={activeMode !== 'current'}
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {!orderedCalendar.length ? (
            <>
              <div id="chart-created-closed">
                <CreatedVsClosedBySprintBar
                  data={[]}
                  emptyMessage="SprintCalendar required to display this chart"
                />
              </div>
              <div id="chart-net">
                <NetBySprintLine
                  data={[]}
                  emptyMessage="SprintCalendar required to display this chart"
                />
              </div>
            </>
          ) : isSprintLoading ? (
            <>
              <div id="chart-created-closed">
                <SprintChartSkeleton />
              </div>
              <div id="chart-net">
                <SprintChartSkeleton />
              </div>
            </>
          ) : (
            <>
              <div id="chart-created-closed">
                {sprintAllZero ? (
                  <CreatedVsClosedBySprintBar
                    data={[]}
                    emptyMessage={sprintNoDataMessage}
                    diagnostic={sprintDiagnostic}
                  />
                ) : (
                  <CreatedVsClosedBySprintBar data={sprintMetrics} />
                )}
              </div>
              <div id="chart-net">
                {orderedCalendar.length === 1 ? (
                  <NetBySprintLine
                    data={sprintMetrics}
                    emptyMessage={oneSprintTimelineMessage}
                    diagnostic={sprintDiagnostic}
                  />
                ) : netTimelineAllZero ? (
                  <NetBySprintLine
                    data={[]}
                    emptyMessage={sprintNoDataMessage}
                    diagnostic={sprintDiagnostic}
                  />
                ) : (
                  <NetBySprintLine data={sprintMetrics} />
                )}
              </div>
            </>
          )}

          <div id="chart-dev">
            <ClosedByDevBar data={devMetrics} />
          </div>
          <div id="chart-category">
            <CategoryStackedBar data={categoryMetrics} />
          </div>
          <div id="chart-open-state" className="lg:col-span-2">
            {orderedCalendar.length === 0 ? (
              <OpenBySprintStateBar
                rows={[]}
                states={[]}
                emptyMessage="SprintCalendar required to display this chart"
              />
            ) : (
              <OpenBySprintStateBar
                rows={openByStateResult.rows}
                states={openByStateResult.states}
                emptyMessage="No open bugs available for sprint/state view"
              />
            )}
          </div>
          <div id="chart-active" className="lg:col-span-2">
            {orderedCalendar.length === 0 ? (
              <ActiveBySprintBar
                data={[]}
                mode={activeMode}
                asOfDate={asOfDate}
                emptyMessage="SprintCalendar required to display this chart"
              />
            ) : (
              <ActiveBySprintBar data={activeBySprint} mode={activeMode} asOfDate={asOfDate} />
            )}
          </div>
          <div id="chart-priority-severity" className="lg:col-span-2">
            <OpenByPrioritySeverityMatrix result={openByPrioritySeverity} />
          </div>
          <div id="chart-open-cas">
            <OpenCasBreakdownBar data={openCasAging.breakdown} />
          </div>
          <div id="table-open-aging" className="lg:col-span-2">
            <OpenBugAgingTable rows={openCasAging.rows} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
