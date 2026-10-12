import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { SaveRelocationRequest } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { ChecklistReview } from './checklist-review';
import { RelocationEditor } from './relocation-editor';

describe('RelocationEditor', () => {
  it('creates a relocation and opens its checklist', async () => {
    let created: SaveRelocationRequest | undefined;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'relocations/new', component: RelocationEditor },
          { path: 'relocations/:id/checklist', component: ChecklistReview },
        ]),
        {
          provide: ReloviaClient,
          useValue: {
            createRelocation: (body: SaveRelocationRequest) => {
              created = body;
              return Promise.resolve({
                id: '0199f0a1-7c00-7000-8000-000000000099',
                ...body,
                isInternational: true,
                createdAt: '2026-10-12T12:00:00.000Z',
                updatedAt: '2026-10-12T12:00:00.000Z',
              });
            },
            getRelocation: () =>
              Promise.resolve({
                id: '0199f0a1-7c00-7000-8000-000000000099',
                name: 'Berlin move',
                originCountryCode: 'CL',
                originCity: 'Santiago',
                destinationCountryCode: 'DE',
                destinationCity: 'Berlin',
                targetDate: '2026-12-01',
                purpose: 'Work',
                status: 'Draft',
                isInternational: true,
                createdAt: '2026-10-12T12:00:00.000Z',
                updatedAt: '2026-10-12T12:00:00.000Z',
              }),
            listTasks: () =>
              Promise.resolve({ progress: { done: 0, counted: 0, ratio: 0 }, tasks: [] }),
            getChecklistSuggestion: () =>
              Promise.resolve({
                relocationId: '0199f0a1-7c00-7000-8000-000000000099',
                targetDate: '2026-12-01',
                templateCodes: ['international-core'],
                tasks: [],
              }),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/relocations/new');
    const root = harness.routeNativeElement!;
    expect(root.querySelector('#origin-country')?.textContent).toContain('Chile');
    expect(root.querySelector('#destination-country')?.textContent).toContain('Germany');
    setValue(root.querySelector('#name'), 'Berlin move');
    setSelect(root.querySelector('#origin-country'), 'CL');
    setValue(root.querySelector('#origin-city'), 'Santiago');
    setSelect(root.querySelector('#destination-country'), 'DE');
    setValue(root.querySelector('#destination-city'), 'Berlin');
    setValue(root.querySelector('#target-date'), '2026-12-01');
    harness.detectChanges();
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();

    expect(created).toMatchObject({
      name: 'Berlin move',
      originCountryCode: 'CL',
      destinationCountryCode: 'DE',
      purpose: 'Work',
      status: 'Draft',
    });
    expect(TestBed.inject(Router).url).toBe(
      '/relocations/0199f0a1-7c00-7000-8000-000000000099/checklist',
    );
  });

  it('shows a country-code error without saving', async () => {
    let saved = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'relocations/new', component: RelocationEditor }]),
        {
          provide: ReloviaClient,
          useValue: {
            createRelocation: () => {
              saved = true;
              return Promise.reject(new Error('should not save'));
            },
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/relocations/new');
    const root = harness.routeNativeElement!;
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(root.textContent).toContain('Select a country.');
    expect(saved).toBe(false);
  });
});

function setSelect(select: Element | null, value: string): void {
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error('Missing select');
  }

  select.value = value;
  select.dispatchEvent(new Event('change'));
}

function setValue(input: Element | null, value: string): void {
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Missing input');
  }

  input.value = value;
  input.dispatchEvent(new Event('input'));
}
