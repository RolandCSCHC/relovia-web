import type {
  RelocationPurpose,
  RelocationStatus,
  RelocationTaskStatus,
  TaskPhase,
  TaskPriority,
} from '../api/generated/types.gen';

export interface LabeledValue<T extends string> {
  value: T;
  label: string;
}

export const purposes: readonly LabeledValue<RelocationPurpose>[] = [
  { value: 'Work', label: 'Work' },
  { value: 'Study', label: 'Study' },
  { value: 'Family', label: 'Family' },
  { value: 'Lifestyle', label: 'Lifestyle' },
  { value: 'Other', label: 'Other' },
];

export const relocationStatuses: readonly LabeledValue<RelocationStatus>[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Active', label: 'Active' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Archived', label: 'Archived' },
];

export const phases: readonly LabeledValue<TaskPhase>[] = [
  { value: 'Preparation', label: 'Preparation' },
  { value: 'Housing', label: 'Housing' },
  { value: 'Administration', label: 'Administration' },
  { value: 'Finances', label: 'Finances' },
  { value: 'Moving', label: 'Moving' },
  { value: 'Settlement', label: 'Settlement' },
];

export const priorities: readonly LabeledValue<TaskPriority>[] = [
  { value: 'Low', label: 'Low' },
  { value: 'Normal', label: 'Normal' },
  { value: 'High', label: 'High' },
];

export const taskStatuses: readonly LabeledValue<RelocationTaskStatus>[] = [
  { value: 'Todo', label: 'To do' },
  { value: 'InProgress', label: 'In progress' },
  { value: 'Done', label: 'Done' },
  { value: 'Skipped', label: 'Skipped' },
];

export function labelFor<T extends string>(options: readonly LabeledValue<T>[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
