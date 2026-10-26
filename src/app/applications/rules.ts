import type {
  JobApplicationResponse,
  JobApplicationStatus,
  SaveJobApplicationRequest,
} from '../api/generated';
import { formatDate } from '../relocations/dates';
import type { LabeledValue } from '../relocations/labels';

export const applicationStatuses: readonly LabeledValue<JobApplicationStatus>[] = [
  { value: 'Applied', label: 'Applied' },
  { value: 'Interviewing', label: 'Interviewing' },
  { value: 'Offer', label: 'Offer' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Withdrawn', label: 'Withdrawn' },
];

export interface ApplicationInput {
  employer: string;
  role: string;
  location: string;
  appliedOn: string;
  nextOn: string;
  status: JobApplicationStatus;
  includesSupport: '' | 'yes' | 'no';
  notes: string;
}

export function emptyApplicationDraft(): ApplicationInput {
  return {
    employer: '',
    role: '',
    location: '',
    appliedOn: '',
    nextOn: '',
    status: 'Applied',
    includesSupport: '',
    notes: '',
  };
}

export function applicationDraft(application: JobApplicationResponse): ApplicationInput {
  return {
    employer: application.employer,
    role: application.role,
    location: application.location ?? '',
    appliedOn: application.appliedOn ?? '',
    nextOn: application.nextOn ?? '',
    status: application.status,
    includesSupport:
      application.includesSupport === null ? '' : application.includesSupport ? 'yes' : 'no',
    notes: application.notes ?? '',
  };
}

export function applicationProblem(input: ApplicationInput): string | null {
  if (!input.employer.trim()) {
    return 'Employer is required.';
  }

  if (input.employer.trim().length > 200) {
    return 'Employer must be 200 characters or fewer.';
  }

  if (!input.role.trim()) {
    return 'Role is required.';
  }

  if (input.role.trim().length > 200) {
    return 'Role must be 200 characters or fewer.';
  }

  if (input.location.trim().length > 200) {
    return 'Location must be 200 characters or fewer.';
  }

  if (input.notes.trim().length > 1000) {
    return 'Notes must be 1000 characters or fewer.';
  }

  return null;
}

export function applicationRequest(input: ApplicationInput): SaveJobApplicationRequest {
  return {
    employer: input.employer.trim(),
    role: input.role.trim(),
    location: input.location.trim() || null,
    appliedOn: input.appliedOn || null,
    nextOn: input.nextOn || null,
    status: input.status,
    includesSupport: input.includesSupport === '' ? null : input.includesSupport === 'yes',
    notes: input.notes.trim() || null,
  };
}

export function applicationFacts(application: JobApplicationResponse): string[] {
  const lines = [join(application.role, application.location)];
  const dates = join(
    application.appliedOn ? `Applied ${formatDate(application.appliedOn)}` : null,
    application.nextOn ? `Next ${formatDate(application.nextOn)}` : null,
  );
  if (dates) {
    lines.push(dates);
  }

  if (application.includesSupport === true) {
    lines.push('Visa or relocation support');
  } else if (application.includesSupport === false) {
    lines.push('No visa or relocation support');
  }

  if (application.notes) {
    lines.push(application.notes);
  }

  return lines.filter((line) => line.length > 0);
}

function join(...parts: (string | null | undefined)[]): string {
  return parts.filter((part) => part).join(' · ');
}
