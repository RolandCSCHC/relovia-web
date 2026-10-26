import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  BudgetResponse,
  DocumentResponse,
  InventoryItemResponse,
  RelocationCalendarResponse,
  RelocationResponse,
  RelocationTasksResponse,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { SummaryPage } from './summary-page';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';

describe('SummaryPage', () => {
  it('shows the short page and downloads its pdf', async () => {
    let downloaded = false;
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:summary';
    URL.revokeObjectURL = () => undefined;

    try {
      const harness = await open({
        downloadSummaryPdf: () => {
          downloaded = true;
          return Promise.resolve(new Blob(['%PDF']));
        },
      });
      const root = harness.routeNativeElement!;

      const openTasks = [...root.querySelectorAll('section')]
        .find((section) => section.querySelector('h2')?.textContent?.trim() === 'Open tasks')
        ?.querySelectorAll('h3');
      expect([...(openTasks ?? [])].map((heading) => heading.textContent?.trim())).toEqual([
        'Book the flight',
        'Give notice',
      ]);
      expect(root.textContent).toContain('Give notice');
      expect(root.textContent).not.toContain('Tell the landlord in writing.');
      expect(root.textContent).not.toContain('https://example.com/notice');
      expect(root.textContent).not.toContain('Close the account');
      expect(root.textContent).toContain('Sheets');
      expect(root.textContent).toContain('Not packed');
      expect(root.textContent).not.toContain('Sofa');
      expect(root.textContent).toContain('Housing');
      expect(root.textContent).toContain('Move day');
      expect(root.textContent).toContain('passport.pdf');
      expect(root.textContent).toContain('0 of 1 done');
      expect(root.textContent).not.toContain('Print');
      expect(root.textContent).not.toContain('Monthly net income');
      expect(root.textContent).not.toContain('NZD');

      clickButton(root, 'Download Summary');
      await harness.fixture.whenStable();
      expect(downloaded).toBe(true);
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it('says when the budget is not set up and nothing is left to pack', async () => {
    const harness = await open({
      getBudget: () => Promise.resolve(emptyBudget()),
      listInventoryItems: () => Promise.resolve([]),
      getCalendar: () => Promise.resolve({ events: [], taskDueDates: [] }),
      listDocuments: () => Promise.resolve([]),
      listTasks: () => Promise.resolve(doneOnly()),
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('The budget is not set up yet.');
    expect(root.textContent).toContain('Nothing is marked to bring.');
    expect(root.textContent).toContain('No open tasks.');
    expect(root.textContent).toContain('No dates yet.');
  });
});

function open(overrides: Partial<ReloviaClient> = {}): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'relocations/:id/summary', component: SummaryPage }]),
      {
        provide: ReloviaClient,
        useValue: {
          getRelocation: () => Promise.resolve(relocation()),
          listTasks: () => Promise.resolve(tasks()),
          getBudget: () => Promise.resolve(budget()),
          listInventoryItems: () => Promise.resolve([sheets(), sofa()]),
          getCalendar: () => Promise.resolve(calendar()),
          listDocuments: () => Promise.resolve([passport()]),
          ...overrides,
        },
      },
    ],
  });
  return RouterTestingHarness.create().then(async (harness) => {
    await harness.navigateByUrl(`/relocations/${relocationId}/summary`);
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness;
  });
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

function tasks(): RelocationTasksResponse {
  return {
    progress: { done: 0, counted: 1, ratio: 0 },
    tasks: [
      {
        id: '0199f0a1-7c00-7000-8000-000000000021',
        code: 'give-notice',
        title: 'Give notice',
        description: 'Tell the landlord in writing.',
        url: 'https://example.com/notice',
        daysBeforeMove: 60,
        dueDate: '2026-10-02',
        phase: 'Housing',
        priority: 'High',
        status: 'Todo',
        sourceTemplateTaskId: null,
        dependencies: [],
        documentIds: [],
        position: 1,
      },
      {
        id: '0199f0a1-7c00-7000-8000-000000000023',
        code: 'book-flight',
        title: 'Book the flight',
        description: null,
        url: null,
        daysBeforeMove: 14,
        dueDate: '2026-09-01',
        phase: 'Moving',
        priority: 'Normal',
        status: 'Todo',
        sourceTemplateTaskId: null,
        dependencies: [],
        documentIds: [],
        position: 0,
      },
      {
        id: '0199f0a1-7c00-7000-8000-000000000022',
        code: 'close-account',
        title: 'Close the account',
        description: null,
        url: null,
        daysBeforeMove: 1,
        dueDate: '2026-11-30',
        phase: 'Finances',
        priority: 'Normal',
        status: 'Done',
        sourceTemplateTaskId: null,
        dependencies: [],
        documentIds: [],
        position: 2,
      },
    ],
  };
}

function doneOnly(): RelocationTasksResponse {
  return {
    progress: { done: 1, counted: 1, ratio: 1 },
    tasks: [tasks().tasks.find((task) => task.status === 'Done')!],
  };
}

function budget(): BudgetResponse {
  return {
    currencyCode: 'EUR',
    categories: [
      {
        id: '0199f0a1-7c00-7000-8000-000000000031',
        name: 'Housing',
        estimates: [],
        estimated: 1000,
        actual: 200,
        remaining: 800,
        expenseCount: 0,
        shopping: [],
      },
    ],
    totals: { estimated: 1000, actual: 200, remaining: 800 },
    unconverted: [],
    ratesAsOf: '2026-10-17T00:00:00+00:00',
    ratesUnavailable: false,
    monthlyNetIncome: 4000,
    monthlyNetIncomeCurrency: 'NZD',
  };
}

function emptyBudget(): BudgetResponse {
  return {
    currencyCode: null,
    categories: [],
    totals: { estimated: 0, actual: 0, remaining: 0 },
    unconverted: [],
    ratesAsOf: null,
    ratesUnavailable: false,
  };
}

function sheets(): InventoryItemResponse {
  return {
    id: '0199f0a1-7c00-7000-8000-000000000071',
    name: 'Sheets',
    category: 'Linens',
    room: 'Bedroom',
    quantity: 2,
    acquisition: 'Owned',
    movingAction: 'Bring',
    packingStatus: 'NotPacked',
    priority: 'Normal',
    estimatedPrice: null,
    actualPrice: null,
    currencyCode: null,
    budgetCategoryId: null,
    notes: null,
    code: null,
    sourceTemplateItemId: null,
  };
}

function sofa(): InventoryItemResponse {
  return {
    id: '0199f0a1-7c00-7000-8000-000000000072',
    name: 'Sofa',
    category: 'Furniture',
    room: 'LivingRoom',
    quantity: 1,
    acquisition: 'Owned',
    movingAction: 'Bring',
    packingStatus: 'Packed',
    priority: 'High',
    estimatedPrice: null,
    actualPrice: null,
    currencyCode: null,
    budgetCategoryId: null,
    notes: null,
    code: null,
    sourceTemplateItemId: null,
  };
}

function calendar(): RelocationCalendarResponse {
  return {
    events: [
      {
        id: '0199f0a1-7c00-7000-8000-000000000081',
        title: 'Move day',
        kind: 'Milestone',
        occursOn: '2026-12-01',
        startsAt: null,
        endsAt: null,
        location: null,
      },
    ],
    taskDueDates: [],
  };
}

function passport(): DocumentResponse {
  return {
    id: '0199f0a1-7c00-7000-8000-000000000061',
    fileName: 'passport.pdf',
    contentType: 'application/pdf',
    sizeBytes: 12 * 1024,
    createdAt: '2026-10-24T13:50:00.000Z',
    category: 'Visa',
    expiresOn: '2027-06-01',
    taskIds: [],
  };
}
