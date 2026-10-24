import type { DocumentCategory } from '../api/generated';
import type { LabeledValue } from '../relocations/labels';

export const documentCategories: readonly LabeledValue<DocumentCategory>[] = [
  { value: 'Identity', label: 'Identity' },
  { value: 'Visa', label: 'Visa' },
  { value: 'Housing', label: 'Housing' },
  { value: 'Employment', label: 'Employment' },
  { value: 'Education', label: 'Education' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Health', label: 'Health' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Moving', label: 'Moving' },
  { value: 'Other', label: 'Other' },
];
