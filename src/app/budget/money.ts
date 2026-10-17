const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });

export interface CurrencyOption {
  code: string;
  label: string;
}

// ISO 4217 codes the runtime knows, labelled with their English names.
export const currencies: readonly CurrencyOption[] = Intl.supportedValuesOf('currency').map(
  (code) => ({ code, label: `${code} · ${currencyNames.of(code) ?? code}` }),
);

/** Amounts arrive as JSON numbers, but the generated client also allows numeric strings. */
export function toAmount(value: number | string): number {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * Formats an amount as its currency code followed by "$", for example "CLP $30,944,444" and
 * "NZD $1,200.00". The code keeps CLP, NZD, and USD apart in one budget, since they all use "$".
 *
 * Totals and converted amounts are rounded to the currency's own decimals (none for CLP, two for
 * EUR). Pass `exact` for an amount the user typed, which keeps up to the 4 decimals the API stores.
 */
export function formatMoney(
  value: number | string,
  currencyCode: string,
  options: { exact?: boolean } = {},
): string {
  const amount = toAmount(value);
  const { minimumFractionDigits, maximumFractionDigits } = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
  }).resolvedOptions();
  const digits = new Intl.NumberFormat(undefined, {
    minimumFractionDigits,
    maximumFractionDigits: options.exact
      ? Math.max(4, maximumFractionDigits ?? 0)
      : maximumFractionDigits,
  }).format(Math.abs(amount));

  // A negative that rounds to zero is not shown as negative.
  const isNegative = amount < 0 && Number(digits.replace(/\D/g, '')) > 0;
  return `${isNegative ? '-' : ''}${currencyCode} $${digits}`;
}

/** Parses the text of a number input. Returns null unless it is a positive number the API accepts. */
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

/** The share of an estimate that has been spent, from 0 to 100, for a progress meter. */
export function spentPercent(estimated: number | string, actual: number | string): number {
  const planned = toAmount(estimated);
  const spent = toAmount(actual);
  if (planned <= 0) {
    return spent > 0 ? 100 : 0;
  }

  return Math.max(0, Math.min(100, Math.round((spent / planned) * 100)));
}
