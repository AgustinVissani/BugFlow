import { compareAsc } from 'date-fns';
import type { BugNormalized, SprintCalendarRow } from '../types';

export interface OpenBySprintStateRow {
  sprintName: string;
  stateCounts: Record<string, number>;
}

export interface OpenBySprintStateResult {
  rows: OpenBySprintStateRow[];
  states: string[];
}

const CLOSED_TOKENS = ['closed', 'done', 'resolved'];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isOpenBug(bug: BugNormalized): boolean {
  const state = normalize(bug.state || '');
  const looksClosed = CLOSED_TOKENS.some((token) => state.includes(token));
  return !bug.isClosed || !looksClosed;
}

function normalizeStateLabel(value: string | null): string {
  const text = (value || '').trim();
  return text || 'Unknown';
}

function findMatchingSprintFromBug(bugSprint: string, calendar: SprintCalendarRow[]): string | null {
  const raw = normalize(bugSprint);
  if (!raw) {
    return null;
  }

  for (const sprint of calendar) {
    const sprintName = normalize(sprint.sprintName);
    if (raw.includes(sprintName) || sprintName.includes(raw)) {
      return sprint.sprintName;
    }
  }

  return null;
}

export function computeOpenBySprintState(
  bugs: BugNormalized[],
  calendar: SprintCalendarRow[],
): OpenBySprintStateResult {
  const orderedCalendar = [...calendar].sort((a, b) => compareAsc(a.startDate, b.startDate));
  const sprintRows = new Map<string, Record<string, number>>();
  orderedCalendar.forEach((sprint) => {
    sprintRows.set(sprint.sprintName, {});
  });
  sprintRows.set('No sprint', {});

  const stateTotals = new Map<string, number>();

  bugs.filter(isOpenBug).forEach((bug) => {
    const stateLabel = normalizeStateLabel(bug.state);
    const matchedSprint = bug.sprint ? findMatchingSprintFromBug(bug.sprint, orderedCalendar) : null;
    const sprintName = matchedSprint || 'No sprint';

    const row = sprintRows.get(sprintName) || {};
    row[stateLabel] = (row[stateLabel] || 0) + 1;
    sprintRows.set(sprintName, row);

    stateTotals.set(stateLabel, (stateTotals.get(stateLabel) || 0) + 1);
  });

  const orderedStates = [...stateTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([state]) => state);

  const maxStates = 8;
  const visibleStates = orderedStates.slice(0, maxStates);
  const collapsedStates = orderedStates.slice(maxStates);

  const rows: OpenBySprintStateRow[] = [];
  for (const sprint of [...orderedCalendar.map((row) => row.sprintName), 'No sprint']) {
    const counts = sprintRows.get(sprint) || {};
    const finalCounts: Record<string, number> = {};

    visibleStates.forEach((state) => {
      finalCounts[state] = counts[state] || 0;
    });

    if (collapsedStates.length > 0) {
      finalCounts.Other = collapsedStates.reduce((acc, state) => acc + (counts[state] || 0), 0);
    }

    const hasAny = Object.values(finalCounts).some((value) => value > 0);
    if (hasAny || sprint !== 'No sprint') {
      rows.push({ sprintName: sprint, stateCounts: finalCounts });
    }
  }

  const states = [...visibleStates];
  if (collapsedStates.length > 0) {
    states.push('Other');
  }

  return { rows, states };
}
