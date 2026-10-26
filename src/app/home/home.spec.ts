import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { RelocationResponse, RelocationTasksResponse } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { Home } from './home';

describe('Home', () => {
  it('shows each relocation with its progress', async () => {
    const tasks: RelocationTasksResponse = {
      progress: { done: 1, counted: 3, ratio: 1 / 3 },
      tasks: [
        {
          id: '0199f0a1-7c00-7000-8000-000000000021',
          code: 'give-notice',
          title: 'Give notice',
          description: null,
          url: null,
          daysBeforeMove: 60,
          dueDate: '2026-10-02',
          phase: 'Housing',
          priority: 'High',
          status: 'Done',
          sourceTemplateTaskId: null,
          dependencies: [],
          documentIds: [],
        },
      ],
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: Home }]),
        {
          provide: ReloviaClient,
          useValue: {
            listRelocations: () => Promise.resolve([relocation()]),
            listTasks: () => Promise.resolve(tasks),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    await harness.fixture.whenStable();
    harness.detectChanges();
    const text = harness.routeNativeElement?.textContent ?? '';

    expect(text).toContain('Berlin move');
    expect(text).toContain('Santiago, Chile to Berlin, Germany');
    expect(text).toContain('International');
    expect(text).toContain('1 of 3 done');
    expect(harness.routeNativeElement?.querySelector('a.move')?.getAttribute('href')).toBe(
      '/relocations/0199f0a1-7c00-7000-8000-000000000010',
    );
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('says when there are no relocations', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: Home }]),
        {
          provide: ReloviaClient,
          useValue: {
            listRelocations: () => Promise.resolve([]),
            listTasks: () => Promise.resolve({ progress: emptyProgress(), tasks: [] }),
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('You have no relocations yet.');
  });
});

function relocation(): RelocationResponse {
  return {
    id: '0199f0a1-7c00-7000-8000-000000000010',
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

function emptyProgress() {
  return { done: 0, counted: 0, ratio: 0 };
}
