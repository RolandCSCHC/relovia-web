import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  ConfirmChecklistRequest,
  RelocationResponse,
  RelocationTasksResponse,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { ChecklistReview } from './checklist-review';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';

describe('ChecklistReview', () => {
  it('confirms only the tasks that stay selected', async () => {
    let confirmed: ConfirmChecklistRequest | undefined;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'relocations/:id/checklist', component: ChecklistReview },
          { path: 'relocations/:id', component: ChecklistReview },
        ]),
        { provide: ReloviaClient, useValue: fakeApi((body) => (confirmed = body)) },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/relocations/${relocationId}/checklist`);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement!;
    const boxes = root.querySelectorAll('input[type="checkbox"]');
    (boxes[1] as HTMLInputElement).click();
    harness.detectChanges();
    root.querySelector('button')?.click();
    await harness.fixture.whenStable();

    expect(confirmed?.tasks.map((task) => task.code)).toEqual(['give-notice']);
    expect(confirmed?.tasks[0]).toMatchObject({ title: 'Give notice', daysBeforeMove: 60 });
  });

  it('does not offer another confirm once tasks exist', async () => {
    let confirmed = false;
    const api = fakeApi(() => (confirmed = true));
    api.listTasks = () =>
      Promise.resolve({
        progress: { done: 0, counted: 1, ratio: 0 },
        tasks: [
          {
            id: '0199f0a1-7c00-7000-8000-000000000021',
            code: 'give-notice',
            title: 'Give notice',
            daysBeforeMove: 60,
            dueDate: '2026-10-02',
            phase: 'Housing',
            priority: 'High',
            status: 'Todo',
            sourceTemplateTaskId: null,
            dependencies: [],
            documentIds: [],
          },
        ],
      });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'relocations/:id/checklist', component: ChecklistReview }]),
        { provide: ReloviaClient, useValue: api },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/relocations/${relocationId}/checklist`);
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('already confirmed');
    expect(harness.routeNativeElement?.textContent).not.toContain('Confirm checklist');
    expect(confirmed).toBe(false);
  });
});

function fakeApi(onConfirm: (body: ConfirmChecklistRequest) => void) {
  const relocation: RelocationResponse = {
    id: relocationId,
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
  };
  return {
    getRelocation: () => Promise.resolve(relocation),
    listTasks: (): Promise<RelocationTasksResponse> =>
      Promise.resolve({ progress: { done: 0, counted: 0, ratio: 0 }, tasks: [] }),
    getChecklistSuggestion: () =>
      Promise.resolve({
        relocationId,
        targetDate: '2026-12-01',
        templateCodes: ['international-core'],
        tasks: [
          {
            code: 'give-notice',
            title: 'Give notice',
            daysBeforeMove: 60,
            dueDate: '2026-10-02',
            phase: 'Housing' as const,
            priority: 'High' as const,
            sourceTemplateTaskId: '0199f0a1-7c00-7000-8000-000000000031',
            dependsOnCodes: [],
          },
          {
            code: 'book-movers',
            title: 'Book movers',
            daysBeforeMove: 30,
            dueDate: '2026-11-01',
            phase: 'Moving' as const,
            priority: 'Normal' as const,
            sourceTemplateTaskId: '0199f0a1-7c00-7000-8000-000000000032',
            dependsOnCodes: ['give-notice'],
          },
        ],
      }),
    confirmChecklist: (_id: string, body: ConfirmChecklistRequest) => {
      onConfirm(body);
      return Promise.resolve({ progress: { done: 0, counted: 0, ratio: 0 }, tasks: [] });
    },
  };
}
