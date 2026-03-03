import type { BugNormalized } from '../types';

export interface OpenByPrioritySeverityRow {
  priority: string;
  total: number;
  severityCounts: Record<string, number>;
}

export interface OpenByPrioritySeverityResult {
  rows: OpenByPrioritySeverityRow[];
  severities: string[];
  totalOpen: number;
}

function normalizeBucketLabel(value: string | null): string {
  return value && value.trim().length > 0 ? value.trim() : 'Unspecified';
}

function labelSortKey(label: string): [number, string] {
  const numericMatch = label.match(/^\s*(\d+)\b/);
  if (numericMatch) {
    return [Number(numericMatch[1]), label.toLowerCase()];
  }

  const lowered = label.toLowerCase();
  if (lowered.includes('critical') || lowered.includes('highest') || lowered.includes('blocker')) {
    return [0, lowered];
  }
  if (lowered.includes('high')) {
    return [1, lowered];
  }
  if (lowered.includes('medium') || lowered.includes('normal')) {
    return [2, lowered];
  }
  if (lowered.includes('low') || lowered.includes('minor')) {
    return [3, lowered];
  }
  if (lowered === 'unspecified') {
    return [99, lowered];
  }

  return [10, lowered];
}

function sortLabels(a: string, b: string): number {
  const [aRank, aLabel] = labelSortKey(a);
  const [bRank, bLabel] = labelSortKey(b);
  if (aRank !== bRank) {
    return aRank - bRank;
  }
  return aLabel.localeCompare(bLabel);
}

export function computeOpenByPrioritySeverity(bugs: BugNormalized[]): OpenByPrioritySeverityResult {
  const openBugs = bugs.filter((bug) => !bug.isClosed);
  if (openBugs.length === 0) {
    return { rows: [], severities: [], totalOpen: 0 };
  }

  const severitySet = new Set<string>();
  const byPriority = new Map<string, Map<string, number>>();

  openBugs.forEach((bug) => {
    const priority = normalizeBucketLabel(bug.priority);
    const severity = normalizeBucketLabel(bug.severity);
    severitySet.add(severity);

    const severityMap = byPriority.get(priority) ?? new Map<string, number>();
    severityMap.set(severity, (severityMap.get(severity) ?? 0) + 1);
    byPriority.set(priority, severityMap);
  });

  const severities = [...severitySet].sort(sortLabels);
  const rows = [...byPriority.entries()]
    .sort(([priorityA], [priorityB]) => sortLabels(priorityA, priorityB))
    .map(([priority, severityMap]) => {
      const severityCounts: Record<string, number> = {};
      let total = 0;

      severities.forEach((severity) => {
        const value = severityMap.get(severity) ?? 0;
        severityCounts[severity] = value;
        total += value;
      });

      return { priority, total, severityCounts };
    });

  return {
    rows,
    severities,
    totalOpen: openBugs.length,
  };
}
