import { addDays, compareAsc } from 'date-fns';
import type { BugNormalized, SprintCalendarRow } from '../types';

export type ActiveMode = 'current' | 'created';

export interface ActiveBySprintRow {
  sprintName: string;
  active: number;
}

export function findSprintByDate(date: Date, calendar: SprintCalendarRow[]): SprintCalendarRow | null {
  for (const sprint of calendar) {
    const endExclusive = addDays(sprint.endDate, 1);
    if (date >= sprint.startDate && date < endExclusive) {
      return sprint;
    }
  }
  return null;
}

export function computeActiveBySprint(
  bugs: BugNormalized[],
  calendar: SprintCalendarRow[],
  mode: ActiveMode,
  asOfDate: Date,
): ActiveBySprintRow[] {
  const orderedCalendar = [...calendar].sort((a, b) => compareAsc(a.startDate, b.startDate));

  const counts = new Map<string, number>();
  orderedCalendar.forEach((sprint) => {
    counts.set(sprint.sprintName, 0);
  });

  const activeBugs = bugs.filter((bug) => !bug.isClosed);

  if (mode === 'current') {
    const matchedSprint = findSprintByDate(asOfDate, orderedCalendar);
    const bucket = matchedSprint ? matchedSprint.sprintName : 'Out of calendar';
    counts.set(bucket, (counts.get(bucket) || 0) + activeBugs.length);
  } else {
    activeBugs.forEach((bug) => {
      if (!bug.createdDate) {
        counts.set('Unknown/Out of calendar', (counts.get('Unknown/Out of calendar') || 0) + 1);
        return;
      }

      const matchedSprint = findSprintByDate(bug.createdDate, orderedCalendar);
      if (!matchedSprint) {
        counts.set('Unknown/Out of calendar', (counts.get('Unknown/Out of calendar') || 0) + 1);
        return;
      }

      counts.set(matchedSprint.sprintName, (counts.get(matchedSprint.sprintName) || 0) + 1);
    });
  }

  const rows: ActiveBySprintRow[] = orderedCalendar.map((sprint) => ({
    sprintName: sprint.sprintName,
    active: counts.get(sprint.sprintName) || 0,
  }));

  const outOfCalendarCount = counts.get('Out of calendar') || 0;
  const unknownOutCount = counts.get('Unknown/Out of calendar') || 0;

  if (outOfCalendarCount > 0) {
    rows.push({ sprintName: 'Out of calendar', active: outOfCalendarCount });
  }

  if (unknownOutCount > 0) {
    rows.push({ sprintName: 'Unknown/Out of calendar', active: unknownOutCount });
  }

  return rows;
}
