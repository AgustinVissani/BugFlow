import type { BugCategory, BugNormalized, CategoryMetricsRow } from '../types';

const CATEGORY_ORDER: BugCategory[] = [
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

export function computeCategoryMetrics(bugs: BugNormalized[]): CategoryMetricsRow[] {
  const base = new Map<BugCategory, CategoryMetricsRow>();
  CATEGORY_ORDER.forEach((category) => {
    base.set(category, { category, total: 0, open: 0, closed: 0 });
  });

  bugs.forEach((bug) => {
    const row = base.get(bug.category);
    if (!row) {
      return;
    }
    row.total += 1;
    if (bug.isClosed) {
      row.closed += 1;
    } else {
      row.open += 1;
    }
  });

  return CATEGORY_ORDER.map((category) => base.get(category) as CategoryMetricsRow);
}
