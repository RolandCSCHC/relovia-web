import type { NotificationChannel, ReminderKind } from '../api/generated';
import type { LabeledValue } from '../relocations/labels';

export const reminderChannels: readonly LabeledValue<NotificationChannel>[] = [
  { value: 'None', label: 'Off' },
  { value: 'InApp', label: 'In the app' },
  { value: 'Email', label: 'By email' },
  { value: 'Both', label: 'In the app and by email' },
];

export const daysBeforeMessage = 'Remind between 0 and 90 days before.';

export function preferenceProblem(daysBefore: number): string | null {
  if (!Number.isInteger(daysBefore) || daysBefore < 0 || daysBefore > 90) {
    return daysBeforeMessage;
  }

  return null;
}

export function reminderKindLabel(kind: ReminderKind): string {
  switch (kind) {
    case 'TaskDue':
      return 'Task';
    case 'Milestone':
      return 'Milestone';
    case 'Appointment':
      return 'Appointment';
    case 'DocumentExpiration':
      return 'Document';
  }
}
