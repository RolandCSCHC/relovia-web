export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function dueOn(targetDate: string, daysBeforeMove: number): string {
  const [year, month, day] = targetDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - daysBeforeMove);
  return date.toISOString().slice(0, 10);
}

export function asCount(value: number | string): number {
  const count = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(count) ? count : 0;
}
