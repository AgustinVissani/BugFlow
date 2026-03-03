import { addDays, compareAsc } from 'date-fns';
import type { BugNormalized, SprintCalendarRow, SprintMetricsRow } from '../types';

export function computeSprintMetrics(
  bugs: BugNormalized[],
  calendar: SprintCalendarRow[],
): SprintMetricsRow[] {
  const orderedCalendar = [...calendar].sort((a, b) => compareAsc(a.startDate, b.startDate));

  return orderedCalendar.map((sprint) => {
    const endExclusive = addDays(sprint.endDate, 1);

    const created = bugs.filter(
      (bug) =>
        bug.createdDate !== null &&
        bug.createdDate >= sprint.startDate &&
        bug.createdDate < endExclusive,
    ).length;

    const closed = bugs.filter(
      (bug) =>
        bug.closedDate !== null &&
        bug.closedDate >= sprint.startDate &&
        bug.closedDate < endExclusive,
    ).length;

    return {
      sprintName: sprint.sprintName,
      created,
      closed,
      net: created - closed,
    };
  });
}
