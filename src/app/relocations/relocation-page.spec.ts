import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  CreateRelocationTaskRequest,
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
      description: null,
      url: null,
    });
    expect(root.textContent).toContain('1 of 1 done');
  });

  it('adds a task and deletes one', async () => {
    let created: CreateRelocationTaskRequest | undefined;
    let deleted: string | undefined;
    const tasks = taskList();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'relocations/:id', component: RelocationPage }]),
        {
          provide: ReloviaClient,
          useValue: {
            getRelocation: () => Promise.resolve(relocation()),
            listTasks: () => Promise.resolve(tasks),
            createTask: (_relocationId: string, body: CreateRelocationTaskRequest) => {
              created = body;
              tasks.tasks = [
                ...tasks.tasks,
                {
                  ...tasks.tasks[0],
                  id: '0199f0a1-7c00-7000-8000-000000000022',
                  code: 'pack-the-kitchen',
                  title: body.title,
                  description: body.description ?? null,
                  url: body.url ?? null,
                  dueDate: body.dueDate ?? null,
                  phase: body.phase,
                  priority: body.priority,
                  status: 'Todo',
                  dependencies: [],
                },
              ];
              return Promise.resolve(tasks.tasks[1]);
            },
            deleteTask: (_relocationId: string, taskId: string) => {
              deleted = taskId;
              tasks.tasks = tasks.tasks.filter((task) => task.id !== taskId);
              return Promise.resolve();
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

    clickButton(root, 'Add task');
    harness.detectChanges();
    setValue(root.querySelector('#new-task-title'), 'Pack the kitchen');
    setValue(root.querySelector('#new-task-description'), ' Boxes first. ');
    setValue(root.querySelector('#new-task-link'), ' https://example.com/pack ');
    harness.detectChanges();
    root.querySelector('.task-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(created).toMatchObject({
      title: 'Pack the kitchen',
      dueDate: null,
      phase: 'Preparation',
      priority: 'Normal',
      description: 'Boxes first.',
      url: 'https://example.com/pack',
    });
    expect(root.textContent).toContain('Pack the kitchen');

    clickButton(root, 'Delete task');
    harness.detectChanges();
    clickButton(root, 'Delete task');
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(deleted).toBe('0199f0a1-7c00-7000-8000-000000000021');
    expect(root.textContent).not.toContain('Give notice');
  });

  it('shows a description and link, and saves an edit', async () => {
    let updated: UpdateRelocationTaskRequest | undefined;
    const tasks = taskList();
    tasks.tasks[0] = {
      ...tasks.tasks[0],
      description: 'Tell the landlord in writing.',
      url: 'https://example.com/notice',
    };
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
              tasks.tasks[0] = {
                ...tasks.tasks[0],
                title: body.title,
                description: body.description ?? null,
                url: body.url ?? null,
              };
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

    expect(root.textContent).toContain('Tell the landlord in writing.');
    expect(root.querySelector('.task-link')?.getAttribute('href')).toBe(
      'https://example.com/notice',
    );
    expect(root.querySelector('.task-link')?.getAttribute('rel')).toBe('noopener noreferrer');

    clickButton(root, 'Edit task');
    harness.detectChanges();
    setValue(root.querySelector('#edit-task-description'), 'Send the letter.');
    setValue(root.querySelector('#edit-task-link'), 'https://example.com/letter');
    harness.detectChanges();
    root
      .querySelector('#edit-task-description')
      ?.closest('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(updated).toMatchObject({
      title: 'Give notice',
      description: 'Send the letter.',
      url: 'https://example.com/letter',
      status: 'Todo',
    });
    expect(root.textContent).toContain('Send the letter.');
    expect(root.querySelector('.task-link')?.getAttribute('href')).toBe(
      'https://example.com/letter',
    );
  });

  it('rejects a link that is not an http address', async () => {
    let created = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'relocations/:id', component: RelocationPage }]),
        {
          provide: ReloviaClient,
          useValue: {
            getRelocation: () => Promise.resolve(relocation()),
            listTasks: () => Promise.resolve(taskList()),
            createTask: () => {
              created = true;
              return Promise.resolve(taskList().tasks[0]);
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

    clickButton(root, 'Add task');
    harness.detectChanges();
    setValue(root.querySelector('#new-task-title'), 'Call the landlord');
    setValue(root.querySelector('#new-task-link'), 'javascript:alert(1)');
    harness.detectChanges();
    root.querySelector('.task-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(created).toBe(false);
    expect(root.textContent).toContain('Link must be an absolute http or https address.');
  });
});

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
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    throw new Error('Missing input');
  }

  input.value = value;
  input.dispatchEvent(new Event('input'));
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

function taskList(): RelocationTasksResponse {
  return {
    progress: { done: 0, counted: 1, ratio: 0 },
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
        status: 'Todo',
        sourceTemplateTaskId: null,
        dependencies: [],
        documentIds: [],
      },
    ],
  };
}
