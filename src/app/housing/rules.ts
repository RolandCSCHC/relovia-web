import type {
  HousingFurnishing,
  HousingOptionResponse,
  HousingStatus,
  RentPeriod,
  SaveHousingOptionRequest,
} from '../api/generated';
import { formatMoney, parseAmount } from '../budget/money';
import { formatDate } from '../relocations/dates';
import type { LabeledValue } from '../relocations/labels';

export const housingStatuses: readonly LabeledValue<HousingStatus>[] = [
  { value: 'Considering', label: 'Considering' },
  { value: 'Viewing', label: 'Viewing' },
  { value: 'Offered', label: 'Offered' },
  { value: 'Chosen', label: 'Chosen' },
  { value: 'Dropped', label: 'Dropped' },
];

export const furnishings: readonly LabeledValue<HousingFurnishing>[] = [
  { value: 'Furnished', label: 'Furnished' },
  { value: 'Unfurnished', label: 'Unfurnished' },
];

export interface HousingInput {
  name: string;
  area: string;
  rent: string;
  rentPeriod: '' | RentPeriod;
  deposit: string;
  currencyCode: string;
  size: string;
  furnishing: '' | HousingFurnishing;
  availableOn: string;
  status: HousingStatus;
  notes: string;
}

export function emptyHousingDraft(): HousingInput {
  return {
    name: '',
    area: '',
    rent: '',
    rentPeriod: '',
    deposit: '',
    currencyCode: '',
    size: '',
    furnishing: '',
    availableOn: '',
    status: 'Considering',
    notes: '',
  };
}

export function housingDraft(home: HousingOptionResponse): HousingInput {
  return {
    name: home.name,
    area: home.area ?? '',
    rent: amountText(home.rent),
    rentPeriod: home.rentPeriod ?? '',
    deposit: amountText(home.deposit),
    currencyCode: home.currencyCode ?? '',
    size: home.size ?? '',
    furnishing: home.furnishing ?? '',
    availableOn: home.availableOn ?? '',
    status: home.status,
    notes: home.notes ?? '',
  };
}

export function housingProblem(input: HousingInput): string | null {
  const name = input.name.trim();
  if (!name) {
    return 'Name is required.';
  }

  if (name.length > 200) {
    return 'Name must be 200 characters or fewer.';
  }

  const rent = amountProblem(input.rent);
  if (rent) {
    return rent;
  }

  if (input.rent.trim()) {
    if (input.rentPeriod !== 'Weekly' && input.rentPeriod !== 'Monthly') {
      return 'Choose weekly or monthly.';
    }
  } else if (input.rentPeriod) {
    return 'A home with no rent has no rent period.';
  }

  const deposit = amountProblem(input.deposit);
  if (deposit) {
    return deposit;
  }

  const hasMoney = input.rent.trim().length > 0 || input.deposit.trim().length > 0;
  if (hasMoney && !/^[A-Za-z]{3}$/.test(input.currencyCode.trim())) {
    return 'Enter a three-letter currency code.';
  }

  if (!hasMoney && input.currencyCode.trim()) {
    return 'Enter a rent or a deposit, or leave the currency empty.';
  }

  if (input.area.trim().length > 200) {
    return 'Area must be 200 characters or fewer.';
  }

  if (input.size.trim().length > 80) {
    return 'Size must be 80 characters or fewer.';
  }

  if (input.notes.trim().length > 1000) {
    return 'Notes must be 1000 characters or fewer.';
  }

  return null;
}

export function housingRequest(input: HousingInput): SaveHousingOptionRequest {
  const rent = input.rent.trim() ? parseAmount(input.rent) : null;
  const deposit = input.deposit.trim() ? parseAmount(input.deposit) : null;
  const hasMoney = rent !== null || deposit !== null;
  return {
    name: input.name.trim(),
    area: blankToNull(input.area),
    rent,
    rentPeriod: rent !== null && input.rentPeriod ? input.rentPeriod : null,
    deposit,
    currencyCode: hasMoney ? input.currencyCode : null,
    size: blankToNull(input.size),
    furnishing: input.furnishing || null,
    availableOn: input.availableOn || null,
    status: input.status,
    notes: blankToNull(input.notes),
  };
}

export function housingFacts(home: HousingOptionResponse): string[] {
  const lines: string[] = [];
  if (home.area) {
    lines.push(home.area);
  }

  const money = [
    home.rent != null && home.currencyCode ? rentLine(home) : null,
    home.deposit != null && home.currencyCode
      ? `${formatMoney(home.deposit, home.currencyCode, { exact: true })} deposit`
      : null,
  ].filter((part) => part !== null);
  if (money.length > 0) {
    lines.push(money.join(' · '));
  }

  const facts = [
    home.size,
    home.furnishing,
    home.availableOn ? `Available ${formatDate(home.availableOn)}` : null,
  ].filter((part) => part);
  if (facts.length > 0) {
    lines.push(facts.join(' · '));
  }

  if (home.notes) {
    lines.push(home.notes);
  }

  return lines;
}

function rentLine(home: HousingOptionResponse): string {
  const money = formatMoney(home.rent ?? 0, home.currencyCode ?? '', { exact: true });
  const period = periodWord(home.rentPeriod);
  const amount = period ? `${money} ${period} rent` : `${money} rent`;
  if (home.rentPercentOfIncome == null) {
    return amount;
  }

  const share =
    typeof home.rentPercentOfIncome === 'number'
      ? home.rentPercentOfIncome
      : Number(home.rentPercentOfIncome);
  return `${amount} · ${share.toFixed(1)}% of income`;
}

function periodWord(period: RentPeriod | null): string {
  if (period === 'Weekly') {
    return 'weekly';
  }

  if (period === 'Monthly') {
    return 'monthly';
  }

  return '';
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function amountText(value: number | string | null): string {
  if (value === null) {
    return '';
  }

  return String(value);
}

function amountProblem(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (parseAmount(trimmed) === null) {
    return 'Amount must be greater than zero.';
  }

  const fraction = trimmed.split('.')[1];
  if (fraction && fraction.length > 4) {
    return 'Amount can have at most 4 decimal places.';
  }

  return null;
}
