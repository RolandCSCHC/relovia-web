import type { RelocationPurpose, RelocationStatus, SaveRelocationRequest } from '../api/generated';
import { isCountryCode } from './countries';

export interface RelocationDraft {
  name: string;
  originCountryCode: string;
  originCity: string;
  destinationCountryCode: string;
  destinationCity: string;
  targetDate: string;
  purpose: RelocationPurpose;
  status: RelocationStatus;
}

export function emptyRelocationDraft(): RelocationDraft {
  return {
    name: '',
    originCountryCode: '',
    originCity: '',
    destinationCountryCode: '',
    destinationCity: '',
    targetDate: '',
    purpose: 'Work',
    status: 'Draft',
  };
}

export function relocationErrors(draft: RelocationDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  requireText(errors, 'name', draft.name, 'Name');
  requireCountry(errors, 'originCountryCode', draft.originCountryCode);
  requireText(errors, 'originCity', draft.originCity, 'Origin city');
  requireCountry(errors, 'destinationCountryCode', draft.destinationCountryCode);
  requireText(errors, 'destinationCity', draft.destinationCity, 'Destination city');
  if (!draft.targetDate) {
    errors['targetDate'] = 'Target date is required.';
  }

  return errors;
}

export function relocationRequest(draft: RelocationDraft): SaveRelocationRequest {
  return {
    name: draft.name.trim(),
    originCountryCode: draft.originCountryCode.trim().toUpperCase(),
    originCity: draft.originCity.trim(),
    destinationCountryCode: draft.destinationCountryCode.trim().toUpperCase(),
    destinationCity: draft.destinationCity.trim(),
    targetDate: draft.targetDate,
    purpose: draft.purpose,
    status: draft.status,
  };
}

function requireText(
  errors: Record<string, string>,
  key: string,
  value: string,
  label: string,
): void {
  const text = value.trim();
  if (!text) {
    errors[key] = `${label} is required.`;
    return;
  }

  if (text.length > 200) {
    errors[key] = `${label} must be 200 characters or fewer.`;
  }
}

function requireCountry(errors: Record<string, string>, key: string, value: string): void {
  if (!isCountryCode(value)) {
    errors[key] = 'Select a country.';
  }
}
