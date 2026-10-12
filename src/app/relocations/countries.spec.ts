import { countries, countryName, isCountryCode } from './countries';

describe('countries', () => {
  it('lists each country once, by name', () => {
    const codes = countries.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(countries.map((country) => country.name)).toEqual(
      [...countries]
        .map((country) => country.name)
        .sort((left, right) => left.localeCompare(right, 'en')),
    );
    expect(countryName('cl')).toBe('Chile');
    expect(countryName('DE')).toBe('Germany');
    expect(isCountryCode('CL')).toBe(true);
    expect(isCountryCode('d')).toBe(false);
  });
});
