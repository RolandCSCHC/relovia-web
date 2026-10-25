export const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export interface MonthDay {
  date: string;
  inMonth: boolean;
}

export interface DatedEvent {
  id: string;
  kind: 'Milestone' | 'Appointment';
  title: string;
  occursOn: string | null;
  startsAt: string | null;
}

export interface DatedTask {
  taskId: string;
  title: string;
  dueDate: string;
}

export interface DayMark {
  id: string;
  kind: 'milestone' | 'appointment' | 'task';
  title: string;
}

export interface EventInput {
  kind: 'Milestone' | 'Appointment';
  title: string;
  occursOn: string;
  startsAt: string;
  endsAt: string;
  location: string;
}

export const titleRequiredMessage = 'Title is required.';
export const titleTooLongMessage = 'Title must be 200 characters or fewer.';
export const milestoneDateRequiredMessage = 'A milestone needs a date.';
export const appointmentStartRequiredMessage = 'An appointment needs a start time.';
export const endBeforeStartMessage = 'The end must be after the start.';
export const locationTooLongMessage = 'Location must be 200 characters or fewer.';

const titleMaxLength = 200;
const locationMaxLength = 200;

export function todayKey(now = new Date()): string {
  return dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function monthOf(date: string): { year: number; month: number } {
  const [year, month] = date.split('-').map(Number);
  return { year, month };
}

export function monthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

/** Monday-first cells for one month, including the leading and trailing days. */
export function monthDays(year: number, month: number): MonthDay[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leading = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const total = Math.ceil((leading + daysInMonth) / 7) * 7;
  const cursor = new Date(Date.UTC(year, month - 1, 1 - leading));
  const days: MonthDay[] = [];
  for (let index = 0; index < total; index += 1) {
    const date = dateKey(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate());
    days.push({ date, inMonth: cursor.getUTCMonth() === month - 1 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

/** The local calendar day of an appointment. A milestone uses its own date instead. */
export function appointmentDay(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function marksOn(
  date: string,
  events: readonly DatedEvent[],
  tasks: readonly DatedTask[],
): DayMark[] {
  const milestones = events
    .filter((event) => event.kind === 'Milestone' && event.occursOn === date)
    .map((event) => ({ id: event.id, kind: 'milestone' as const, title: event.title }));
  const appointments = events
    .filter((event) => event.kind === 'Appointment' && appointmentDay(event.startsAt) === date)
    .map((event) => ({ id: event.id, kind: 'appointment' as const, title: event.title }));
  const due = tasks
    .filter((task) => task.dueDate === date)
    .map((task) => ({ id: task.taskId, kind: 'task' as const, title: task.title }));
  return [...milestones, ...appointments, ...due];
}

export function visibleMarks(
  marks: readonly DayMark[],
  limit = 2,
): { shown: DayMark[]; extra: number } {
  return {
    shown: marks.slice(0, limit),
    extra: Math.max(0, marks.length - limit),
  };
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTimeRange(startsAt: string, endsAt: string | null): string {
  const start = formatClock(startsAt);
  return endsAt ? `${start} – ${formatClock(endsAt)}` : start;
}

export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  return `${dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function eventProblem(input: EventInput): string | null {
  const title = input.title.trim();
  if (title.length === 0) {
    return titleRequiredMessage;
  }

  if (title.length > titleMaxLength) {
    return titleTooLongMessage;
  }

  if (input.location.trim().length > locationMaxLength) {
    return locationTooLongMessage;
  }

  if (input.kind === 'Milestone') {
    return input.occursOn ? null : milestoneDateRequiredMessage;
  }

  if (!input.startsAt) {
    return appointmentStartRequiredMessage;
  }

  if (input.endsAt && input.endsAt <= input.startsAt) {
    return endBeforeStartMessage;
  }

  return null;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
