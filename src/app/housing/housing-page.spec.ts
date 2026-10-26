import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  HousingOptionResponse,
  RelocationResponse,
  SaveHousingOptionRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { HousingPage } from './housing-page';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';
const homeId = '0199f0a1-7c00-7000-8000-000000000071';

describe('HousingPage', () => {
  it('shows a chosen home with its rent', async () => {
    const harness = await open({
      listHousing: () => Promise.resolve([flat()]),
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('Kreuzberg flat');
    expect(root.textContent).toContain('Chosen');
    expect(root.textContent).toContain('EUR $1,200.00 rent');
    expect(root.textContent).toContain('Pets allowed');
    expect(root.textContent).toContain('does not change the budget');
  });

  it('refuses a blank name before calling the API', async () => {
    let saved = false;
    const harness = await open({
      createHousing: () => {
        saved = true;
        return Promise.resolve(flat());
      },
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('No homes yet.');
    clickButton(root, 'Add home');
    harness.detectChanges();
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    harness.detectChanges();

    expect(saved).toBe(false);
    expect(root.textContent).toContain('Name is required.');
  });

  it('saves a home with rent in the currency entered', async () => {
    let saved: SaveHousingOptionRequest | undefined;
    const stored: HousingOptionResponse[] = [];
    const harness = await open({
      listHousing: () => Promise.resolve([...stored]),
      createHousing: (_id: string, body: SaveHousingOptionRequest) => {
        saved = body;
        stored.push({
          id: homeId,
          name: body.name,
          area: body.area ?? null,
          rent: body.rent ?? null,
          deposit: body.deposit ?? null,
          currencyCode: body.currencyCode ?? null,
          size: body.size ?? null,
          furnishing: body.furnishing ?? null,
          availableOn: body.availableOn ?? null,
          status: body.status,
          notes: body.notes ?? null,
        });
        return Promise.resolve(stored[0]);
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add home');
    harness.detectChanges();
    setValue(root.querySelector('#housing-name'), 'Kreuzberg flat');
    setValue(root.querySelector('#housing-rent'), '1200');
    setSelect(root.querySelector('#housing-currency'), 'EUR');
    setSelect(root.querySelector('#housing-status'), 'Chosen');
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(saved).toMatchObject({
      name: 'Kreuzberg flat',
      rent: 1200,
      deposit: null,
      currencyCode: 'EUR',
      status: 'Chosen',
    });
    expect(root.textContent).toContain('Kreuzberg flat');
  });

  it('does not offer a new home on a domestic move', async () => {
    const harness = await open({
      getRelocation: () =>
        Promise.resolve({ ...relocation(), destinationCountryCode: 'CL', isInternational: false }),
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('Housing comparison is for an international move.');
    expect(root.textContent).not.toContain('Add home');
    expect(root.textContent).not.toContain('No homes yet.');
  });
});

async function open(overrides: Record<string, unknown>): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'relocations/:id/housing', component: HousingPage }]),
      {
        provide: ReloviaClient,
        useValue: {
          getRelocation: () => Promise.resolve(relocation()),
          listHousing: () => Promise.resolve([]),
          ...overrides,
        },
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/relocations/${relocationId}/housing`);
  await harness.fixture.whenStable();
  harness.detectChanges();
  return harness;
}

function clickButton(root: HTMLElement, name: string): void {
  const button = [...root.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === name,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${name}`);
  }

  button.click();
}

function setValue(input: Element | null, value: string): void {
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Missing input');
  }

  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function setSelect(input: Element | null, value: string): void {
  if (!(input instanceof HTMLSelectElement)) {
    throw new Error('Missing select');
  }

  input.value = value;
  input.dispatchEvent(new Event('change'));
}

function relocation(): RelocationResponse {
  return {
    id: relocationId,
    name: 'Berlin move',
    originCountryCode: 'CL',
    originCity: 'Santiago',
    destinationCountryCode: 'DE',
    destinationCity: 'Berlin',
    targetDate: '2026-12-01',
    purpose: 'Work',
    status: 'Active',
    isInternational: true,
    createdAt: '2026-10-12T12:00:00.000Z',
    updatedAt: '2026-10-12T12:00:00.000Z',
  };
}

function flat(): HousingOptionResponse {
  return {
    id: homeId,
    name: 'Kreuzberg flat',
    area: 'Kreuzberg',
    rent: 1200,
    deposit: 2400,
    currencyCode: 'EUR',
    size: '2 bedrooms',
    furnishing: 'Furnished',
    availableOn: '2026-11-01',
    status: 'Chosen',
    notes: 'Pets allowed',
  };
}
