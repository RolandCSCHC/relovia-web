import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  RelocationResponse,
  RelocationTasksResponse,
  UpdateRelocationTaskRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { RelocationPage } from './relocation-page';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';

describe('RelocationPage', () => {
  it('updates a task status and shows progress', async () => {
    let updated: UpdateRelocationTaskRequest | undefined;
    const tasks = taskList();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'relocations/:id', component: RelocationPage }]),
        {
          provide: ReloviaClient,
          useValue: {
            getRelocation: () => Promise.resolve(relocation()),
            listTasks: () => Promise.resolve(tasks),
            updateTask: (
              _relocationId: string,
              _taskId: string,
              body: UpdateRelocationTaskRequest,
            ) => {
              updated = body;
              tasks.tasks[0] = { ...tasks.tasks[0], status: body.status };
              tasks.progress = { done: 1, counted: 1, ratio: 1 };
              return Promise.resolve(tasks.tasks[0]);
            },
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/relocations/${relocationId}`);
    await harness.fixture.whenStable();
    harness.detectChanges();
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('0 of 1 done');
    expect(root.textContent).toContain('Give notice');
    const select = root.querySelector('select');
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('Missing status select');
    }

    select.value = 'Done';
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(updated).toMatchObject({
      title: 'Give notice',
      dueDate: '2026-10-02',
      phase: 'Housing',
      priority: 'High',
      status: 'Done',
    });
    expect(root.textContent).toContain('1 of 1 done');
  });
});

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

function taskList(): RelocationTasksResponse {
  return {
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
      },
    ],
  };
}
