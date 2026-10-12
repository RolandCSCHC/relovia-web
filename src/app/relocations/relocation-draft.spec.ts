import { emptyRelocationDraft, relocationErrors, relocationRequest } from './relocation-draft';

describe('relocation draft', () => {
  it('asks for a two-letter country code and sends the code in uppercase', () => {
    const draft = {
      ...emptyRelocationDraft(),
      name: ' Berlin move ',
      originCountryCode: 'cl',
      originCity: 'Santiago',
      destinationCountryCode: 'd',
      destinationCity: 'Berlin',
      targetDate: '2026-12-01',
    };

    expect(relocationErrors(draft)['destinationCountryCode']).toBe('Select a country.');

    draft.destinationCountryCode = 'de';
    expect(relocationErrors(draft)).toEqual({});
    expect(relocationRequest(draft)).toMatchObject({
      name: 'Berlin move',
      originCountryCode: 'CL',
      destinationCountryCode: 'DE',
      purpose: 'Work',
      status: 'Draft',
    });
  });
});
