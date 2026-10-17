import { currencies, formatMoney, parseAmount, spentPercent, toAmount } from './money';

describe('money', () => {
  it('formats an amount in the currency it was paid in', () => {
    // The separators follow the browser locale, so match the digits only.
    expect(formatMoney(1500.5, 'EUR')).toMatch(/1\D500\D50/);
    expect(formatMoney('900000', 'CLP')).toMatch(/900\D000/);
    expect(formatMoney(12.345, 'KWD')).toMatch(/12\D345/);
  });

  it('rounds computed amounts to the decimals the currency uses', () => {
    expect(formatMoney(30944444.4445, 'CLP')).toMatch(/^CLP \$30\D944\D444$/);
    expect(formatMoney(1000.6, 'CLP')).toMatch(/^CLP \$1\D001$/);
    expect(formatMoney(10.456, 'NZD')).toMatch(/^NZD \$10\D46$/);
  });

  it('writes the currency code and a dollar sign before every amount', () => {
    expect(formatMoney(5, 'CLP')).toBe('CLP $5');
    expect(formatMoney(5, 'NZD')).toMatch(/^NZD \$5/);
    expect(formatMoney(5, 'USD')).toMatch(/^USD \$5/);
    expect(formatMoney(5, 'EUR')).toMatch(/^EUR \$5/);
    expect(formatMoney(-1500, 'CLP')).toMatch(/^-CLP \$1\D500$/);
  });

  it('keeps the decimals of an amount the user typed', () => {
    expect(formatMoney(0.1235, 'USD', { exact: true })).toMatch(/0\D1235$/);
    expect(formatMoney(750.5, 'USD', { exact: true })).toMatch(/750\D50$/);
  });

  it('reads a numeric string and ignores anything else', () => {
    expect(toAmount('12.5')).toBe(12.5);
    expect(toAmount(3)).toBe(3);
    expect(toAmount('nope')).toBe(0);
  });

  it('accepts only positive amounts from a number input', () => {
    expect(parseAmount(' 12.50 ')).toBe(12.5);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-4')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('caps the spent share for the meter', () => {
    expect(spentPercent(200, 50)).toBe(25);
    expect(spentPercent(200, 500)).toBe(100);
    expect(spentPercent(0, 0)).toBe(0);
    expect(spentPercent(0, 10)).toBe(100);
  });

  it('lists common currencies with their names', () => {
    expect(currencies.find((currency) => currency.code === 'EUR')?.label).toContain('Euro');
    expect(currencies.some((currency) => currency.code === 'CLP')).toBe(true);
  });
});
