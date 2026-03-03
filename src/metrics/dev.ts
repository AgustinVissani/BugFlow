import type { BugNormalized, DevMetricsRow } from '../types';

const EXCLUDED_DEVS = new Set(['jesus hernando', 'sergi dias', 'sergi diaz']);

function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cleanDevName(value: string): string {
  let text = value.trim();

  if (text.includes('<')) {
    text = text.split('<')[0].trim();
  }

  text = text.replace(/\(([^)]*@[^)]*)\)/g, '').trim();

  if (text.includes('\\')) {
    const segments = text.split('\\');
    text = segments[segments.length - 1].trim();
  }

  if (text.includes('@') && !text.includes(' ')) {
    text = text.split('@')[0].replace(/[._-]+/g, ' ').trim();
  }

  text = text.replace(/\s+/g, ' ').trim();
  if (!text) {
    return 'Unassigned';
  }

  const words = text.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]} ${words[1]}`;
  }

  return words[0];
}

export function computeDevMetrics(bugs: BugNormalized[]): DevMetricsRow[] {
  const closedBugs = bugs.filter((bug) => bug.isClosed);

  const counts = new Map<string, number>();
  closedBugs.forEach((bug) => {
    const rawDev = bug.closedBy || bug.assignedTo || 'Unassigned';
    const dev = cleanDevName(rawDev);

    if (EXCLUDED_DEVS.has(normalizeForCompare(dev))) {
      return;
    }

    counts.set(dev, (counts.get(dev) || 0) + 1);
  });

  const totalClosedIncluded = [...counts.values()].reduce((acc, value) => acc + value, 0);

  return [...counts.entries()]
    .map(([dev, closed]) => ({
      dev,
      closed,
      percentOfClosed:
        totalClosedIncluded > 0 ? Number(((closed / totalClosedIncluded) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.closed - a.closed);
}
