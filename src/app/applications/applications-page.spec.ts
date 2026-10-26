import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  JobApplicationResponse,
  RelocationResponse,
  SaveJobApplicationRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { ApplicationsPage } from './applications-page';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';
const applicationId = '0199f0a1-7c00-7000-8000-000000000081';

describe('ApplicationsPage', () => {
  it('shows an application and its next date', async () => {
    const harness = await open({
      listApplications: () => Promise.resolve([northwind()]),
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('Northwind');
    expect(root.textContent).toContain('Engineer');
    expect(root.textContent).toContain('Interviewing');
    expect(root.textContent).toContain('Visa or relocation support');
    expect(root.textContent).toContain('not added to the calendar');
  });

  it('saves an application without calling the calendar', async () => {
    let saved: SaveJobApplicationRequest | undefined;
    const stored: JobApplicationResponse[] = [];
    const harness = await open({
      listApplications: () => Promise.resolve([...stored]),
      createApplication: (_id: string, body: SaveJobApplicationRequest) => {
        saved = body;
        stored.push({
          id: applicationId,
          employer: body.employer,
          role: body.role,
          location: body.location ?? null,
          appliedOn: body.appliedOn ?? null,
          nextOn: body.nextOn ?? null,
          status: body.status,
          includesSupport: body.includesSupport ?? null,
          notes: body.notes ?? null,
        });
        return Promise.resolve(stored[0]);
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add application');
    harness.detectChanges();
    setValue(root.querySelector('#application-employer'), 'Northwind');
    setValue(root.querySelector('#application-role'), 'Engineer');
    setValue(root.querySelector('#application-next'), '2026-11-15');
    setSelect(root.querySelector('#application-support'), 'yes');
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(saved).toMatchObject({
      employer: 'Northwind',
      role: 'Engineer',
      nextOn: '2026-11-15',
      status: 'Applied',
      includesSupport: true,
    });
    expect(root.textContent).toContain('Northwind');
  });

  it('does not offer a new application on a domestic move', async () => {
    const harness = await open({
      getRelocation: () =>
        Promise.resolve({ ...relocation(), destinationCountryCode: 'CL', isInternational: false }),
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('Job applications are for an international move.');
    expect(root.textContent).not.toContain('Add application');
  });
});

async function open(overrides: Record<string, unknown>): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'relocations/:id/applications', component: ApplicationsPage }]),
      {
        provide: ReloviaClient,
        useValue: {
          getRelocation: () => Promise.resolve(relocation()),
          listApplications: () => Promise.resolve([]),
          ...overrides,
        },
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/relocations/${relocationId}/applications`);
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

function northwind(): JobApplicationResponse {
  return {
    id: applicationId,
    employer: 'Northwind',
    role: 'Engineer',
    location: 'Berlin',
    appliedOn: '2026-10-01',
    nextOn: '2026-11-15',
    status: 'Interviewing',
    includesSupport: true,
    notes: 'Second round',
  };
}
