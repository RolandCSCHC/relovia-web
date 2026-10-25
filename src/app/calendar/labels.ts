import type { CalendarEventKind } from '../api/generated';
import type { LabeledValue } from '../relocations/labels';

export const eventKinds: readonly LabeledValue<CalendarEventKind>[] = [
  { value: 'Milestone', label: 'Milestone' },
  { value: 'Appointment', label: 'Appointment' },
];
