export type BugCategory =
  | 'Forecasting'
  | 'Libranzas'
  | 'BU Hora 00:00'
  | 'Turnos / Solapamientos'
  | 'Eliminar turnos / Borrar libranzas'
  | 'Ausencias'
  | 'Optimizador'
  | 'KPIs / Contadores'
  | 'Alertas'
  | 'Shift Finder'
  | 'CAS / Integraciones'
  | 'Others';

export type BugRowRaw = Record<string, unknown>;

export interface BugNormalized {
  id: string;
  workItemType: string | null;
  state: string | null;
  title: string | null;
  tags: string | null;
  areaPath: string | null;
  assignedTo: string | null;
  closedBy: string | null;
  sprint: string | null;
  createdDate: Date | null;
  closedDate: Date | null;
  isClosed: boolean;
  category: BugCategory;
  raw: BugRowRaw;
}

export interface SprintCalendarRow {
  sprintName: string;
  startDate: Date;
  endDate: Date;
}

export interface SprintMetricsRow {
  sprintName: string;
  created: number;
  closed: number;
  net: number;
}

export interface DevMetricsRow {
  dev: string;
  closed: number;
  percentOfClosed: number;
}

export interface CategoryMetricsRow {
  category: BugCategory;
  total: number;
  open: number;
  closed: number;
}

export interface DashboardSummary {
  total: number;
  open: number;
  closed: number;
  minCreatedDate: Date | null;
  maxCreatedDate: Date | null;
}

export interface MetricsResult {
  summary: DashboardSummary;
  sprintMetrics: SprintMetricsRow[];
  devMetrics: DevMetricsRow[];
  categoryMetrics: CategoryMetricsRow[];
  warnings: string[];
}

export interface NormalizationResult {
  rows: BugNormalized[];
  warnings: string[];
  detectedColumns: Record<string, string | null>;
}
