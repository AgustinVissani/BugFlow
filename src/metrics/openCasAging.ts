import type { BugNormalized } from '../types';

export interface OpenCasBreakdownRow {
  scope: 'CAS' | 'CBU';
  open: number;
}

export interface OpenBugAgingRow {
  id: string;
  title: string;
  isCas: boolean;
  isFoundByUs: boolean;
  origin: 'CAS' | 'Created by us' | 'Other';
  state: string;
  sprint: string;
  priority: string;
  severity: string;
  createdDate: Date | null;
  daysOpen: number | null;
  createdBy: string;
  assignedTo: string;
}

export interface OpenCasAgingResult {
  breakdown: OpenCasBreakdownRow[];
  rows: OpenBugAgingRow[];
}

function computeDaysOpen(createdDate: Date | null, asOfDate: Date): number | null {
  if (!createdDate) {
    return null;
  }
  const diffMs = asOfDate.getTime() - createdDate.getTime();
  if (!Number.isFinite(diffMs)) {
    return null;
  }
  return Math.max(0, Math.floor(diffMs / 86400000));
}

function normalizeText(value: string | null): string {
  return (value ?? '').trim();
}

function isCasFromTitle(title: string | null): boolean {
  const cleanTitle = normalizeText(title);
  if (!cleanTitle) {
    return false;
  }
  return /^CAS\b|^CAS[-_:]/i.test(cleanTitle);
}

function isFoundByUsFromTags(tags: string | null): boolean {
  const cleanTags = normalizeText(tags);
  if (!cleanTags) {
    return false;
  }
  return /(^|[\s,;|])found20\d{2}/i.test(cleanTags);
}

export function computeOpenCasAging(bugs: BugNormalized[], asOfDate: Date): OpenCasAgingResult {
  const openBugs = bugs.filter((bug) => !bug.isClosed);
  const rows: OpenBugAgingRow[] = openBugs.map((bug) => {
    const isCas = isCasFromTitle(bug.title);
    const isFoundByUs = !isCas && isFoundByUsFromTags(bug.tags);
    const origin: OpenBugAgingRow['origin'] = isCas ? 'CAS' : isFoundByUs ? 'Created by us' : 'Other';
    return {
      id: bug.id,
      title: bug.title ?? '(No title)',
      isCas,
      isFoundByUs,
      origin,
      state: bug.state ?? 'Unknown',
      sprint: bug.sprint ?? 'Unassigned',
      priority: bug.priority ?? 'Unspecified',
      severity: bug.severity ?? 'Unspecified',
      createdDate: bug.createdDate,
      daysOpen: computeDaysOpen(bug.createdDate, asOfDate),
      createdBy: bug.createdBy ?? 'Unknown',
      assignedTo: bug.assignedTo ?? 'Unassigned',
    };
  });

  rows.sort((a, b) => {
    const aValue = a.daysOpen ?? -1;
    const bValue = b.daysOpen ?? -1;
    if (aValue !== bValue) {
      return bValue - aValue;
    }
    return a.id.localeCompare(b.id);
  });

  const casOpen = rows.filter((row) => row.isCas).length;
  const nonCasOpen = rows.length - casOpen;

  return {
    breakdown: [
      { scope: 'CAS', open: casOpen },
      { scope: 'CBU', open: nonCasOpen },
    ],
    rows,
  };
}
