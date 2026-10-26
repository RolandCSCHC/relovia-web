import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  BudgetCategoryResponse,
  BudgetResponse,
  ExpenseResponse,
  RelocationResponse,
  SaveBudgetEstimateRequest,
  SaveExpenseRequest,
  SaveMonthlyNetIncomeRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { BudgetPage } from './budget-page';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';
const housingId = '0199f0a1-7c00-7000-8000-000000000031';
const movingId = '0199f0a1-7c00-7000-8000-000000000032';

describe('BudgetPage', () => {
  it('asks for a currency before anything else', async () => {
    let saved: string | undefined;
    const state = { budget: emptyBudget() };
    const harness = await open({
      getBudget: () => Promise.resolve(state.budget),
      saveBudget: (_id: string, body: { currencyCode: string }) => {
        saved = body.currencyCode;
        state.budget = budget('EUR', []);
        return Promise.resolve(state.budget);
      },
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('Set up your budget');
    expect(root.querySelector('app-expense-section')).toBeNull();

    const select = root.querySelector('#budget-currency') as HTMLSelectElement;
    select.value = 'EUR';
    select.dispatchEvent(new Event('change'));
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(saved).toBe('EUR');
    expect(root.textContent).not.toContain('Set up your budget');
    expect(root.textContent).toContain('Budget currency: EUR');
  });

  it('compares estimates with spending and flags what is over', async () => {
    const harness = await open({
      getBudget: () => Promise.resolve(comparedBudget()),
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('Housing');
    expect(root.textContent).toMatch(/2\D000\D00 over/);
    expect(root.textContent).toMatch(/800\D00 left/);
    expect(root.textContent).toContain('Not counted, because there is no exchange rate to EUR');
    expect(root.textContent).toMatch(/900\D000/);
    expect(root.textContent).toContain('Deposit');
    expect(root.textContent).toContain('To buy');
    expect(root.textContent).toContain('Lamp');
  });

  it('shows an estimate in its own currency next to what it comes to in the budget currency', async () => {
    const harness = await open({
      getBudget: () => Promise.resolve(comparedBudget()),
    });
    const root = harness.routeNativeElement!;
    const sofa = [...root.querySelectorAll('.estimate')].find((item) =>
      item.textContent?.includes('Sofa'),
    );

    expect(sofa?.textContent).toMatch(/1\D200/);
    expect(sofa?.textContent).toContain('NZD $');
    expect(sofa?.textContent).toMatch(/≈.*1\D000/);
  });

  it('warns when exchange rates could not be loaded', async () => {
    const harness = await open({
      getBudget: () =>
        Promise.resolve({ ...comparedBudget(), ratesAsOf: null, ratesUnavailable: true }),
    });

    expect(harness.routeNativeElement!.textContent).toContain('Exchange rates could not be loaded');
  });

  it('adds an estimate in the budget currency', async () => {
    let created: SaveBudgetEstimateRequest | undefined;
    const harness = await open({
      getBudget: () => Promise.resolve(comparedBudget()),
      createBudgetEstimate: (_id: string, body: SaveBudgetEstimateRequest) => {
        created = body;
        return Promise.resolve({ id: 'new', convertedAmount: body.amount, ...body });
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add estimate to Moving');
    harness.detectChanges();
    setValue(root.querySelector('[aria-label="Estimate label for Moving"]'), 'Movers');
    setValue(root.querySelector('[aria-label="Estimate amount for Moving"]'), '750.5');
    harness.detectChanges();
    root.querySelector('.estimate-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();

    expect(created).toEqual({
      categoryId: movingId,
      label: 'Movers',
      amount: 750.5,
      currencyCode: 'EUR',
    });
  });

  it('adds an estimate in another currency', async () => {
    let created: SaveBudgetEstimateRequest | undefined;
    const harness = await open({
      getBudget: () => Promise.resolve(comparedBudget()),
      createBudgetEstimate: (_id: string, body: SaveBudgetEstimateRequest) => {
        created = body;
        return Promise.resolve({ id: 'new', convertedAmount: null, ...body });
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add estimate to Moving');
    harness.detectChanges();
    setValue(root.querySelector('[aria-label="Estimate label for Moving"]'), 'Boxes');
    setValue(root.querySelector('[aria-label="Estimate amount for Moving"]'), '90');
    const currency = root.querySelector(
      '[aria-label="Estimate currency for Moving"]',
    ) as HTMLSelectElement;
    currency.value = 'NZD';
    currency.dispatchEvent(new Event('change'));
    harness.detectChanges();
    root.querySelector('.estimate-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();

    expect(created).toMatchObject({ label: 'Boxes', amount: 90, currencyCode: 'NZD' });
  });

  it('records an expense in its own currency and refreshes the comparison', async () => {
    let created: SaveExpenseRequest | undefined;
    let loads = 0;
    const harness = await open({
      getBudget: () => {
        loads += 1;
        return Promise.resolve(comparedBudget());
      },
      listExpenses: () => Promise.resolve([expense()]),
      createExpense: (_id: string, body: SaveExpenseRequest) => {
        created = body;
        return Promise.resolve({ ...expense(), ...body, id: 'new' } as ExpenseResponse);
      },
    });
    const root = harness.routeNativeElement!;
    expect(root.textContent).toContain('Movers in Santiago');
    expect(root.textContent).toMatch(/≈.*900/);
    const loadsBefore = loads;

    clickButton(root, 'Add expense');
    harness.detectChanges();
    setValue(root.querySelector('#expense-description'), 'Boxes');
    setValue(root.querySelector('#expense-amount'), '35.5');
    const currency = root.querySelector('#expense-currency') as HTMLSelectElement;
    currency.value = 'CLP';
    currency.dispatchEvent(new Event('change'));
    harness.detectChanges();
    root.querySelector('.expense-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();

    expect(created).toMatchObject({
      categoryId: housingId,
      description: 'Boxes',
      amount: 35.5,
      currencyCode: 'CLP',
      taskId: null,
      notes: null,
    });
    expect(loads).toBeGreaterThan(loadsBefore);
  });

  it('refuses an expense without an amount before calling the API', async () => {
    let called = false;
    const harness = await open({
      getBudget: () => Promise.resolve(comparedBudget()),
      listExpenses: () => Promise.resolve([]),
      createExpense: () => {
        called = true;
        return Promise.resolve(expense());
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add expense');
    harness.detectChanges();
    setValue(root.querySelector('#expense-description'), 'Boxes');
    harness.detectChanges();
    root.querySelector('.expense-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    harness.detectChanges();

    expect(called).toBe(false);
    expect(root.textContent).toContain('Enter an amount greater than zero.');
  });

  it('saves a monthly net income without treating it as an estimate', async () => {
    let saved: SaveMonthlyNetIncomeRequest | undefined;
    const state = { budget: budget('EUR', []) };
    const harness = await open({
      getBudget: () => Promise.resolve(state.budget),
      saveMonthlyNetIncome: (_id: string, body: SaveMonthlyNetIncomeRequest) => {
        saved = body;
        state.budget = {
          ...state.budget,
          monthlyNetIncome: body.amount,
          monthlyNetIncomeCurrency: body.currencyCode,
        };
        return Promise.resolve(state.budget);
      },
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('Monthly net income is not set.');
    expect(root.textContent).toContain('EUR $0.00');
    clickButton(root, 'Set income');
    harness.detectChanges();
    const amount = root.querySelector('#income-amount');
    setValue(amount, '4000');
    const currency = root.querySelector('#income-currency');
    if (!(currency instanceof HTMLSelectElement)) {
      throw new Error('Missing income currency');
    }
    currency.value = 'NZD';
    currency.dispatchEvent(new Event('change'));
    amount?.closest('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(saved).toEqual({ amount: 4000, currencyCode: 'NZD' });
    expect(root.textContent).toContain('Monthly net income:');
    expect(root.textContent).toContain('NZD $4,000.00');
    expect(root.textContent).toContain('EUR $0.00');
  });
});

async function open(overrides: Record<string, unknown>): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'relocations/:id/budget', component: BudgetPage }]),
      {
        provide: ReloviaClient,
        useValue: {
          getRelocation: () => Promise.resolve(relocation()),
          listTasks: () =>
            Promise.resolve({ progress: { done: 0, counted: 0, ratio: 0 }, tasks: [] }),
          listExpenses: () => Promise.resolve([]),
          ...overrides,
        },
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/relocations/${relocationId}/budget`);
  await harness.fixture.whenStable();
  harness.detectChanges();
  return harness;
}

function clickButton(root: HTMLElement, name: string): void {
  const button = [...root.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === name || item.getAttribute('aria-label') === name,
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

function budget(currencyCode: string, categories: BudgetCategoryResponse[]): BudgetResponse {
  return {
    currencyCode,
    categories,
    totals: { estimated: 0, actual: 0, remaining: 0 },
    unconverted: [],
    ratesAsOf: null,
    ratesUnavailable: false,
  };
}

function comparedBudget(): BudgetResponse {
  return {
    currencyCode: 'EUR',
    categories: [
      {
        id: housingId,
        name: 'Housing',
        estimates: [
          {
            id: 'e1',
            categoryId: housingId,
            label: 'Deposit',
            amount: 1000,
            currencyCode: 'EUR',
            convertedAmount: 1000,
          },
        ],
        estimated: 1000,
        actual: 3000,
        remaining: -2000,
        expenseCount: 2,
        shopping: [
          {
            itemId: '0199f0a1-7c00-7000-8000-000000000042',
            name: 'Lamp',
            estimatedPrice: 45.5,
            actualPrice: null,
            currencyCode: 'USD',
            convertedEstimated: 22.75,
            convertedActual: null,
          },
        ],
      },
      {
        id: movingId,
        name: 'Moving',
        estimates: [
          {
            id: 'e2',
            categoryId: movingId,
            label: 'Sofa',
            amount: 1200,
            currencyCode: 'NZD',
            convertedAmount: 1000,
          },
        ],
        estimated: 1000,
        actual: 200,
        remaining: 800,
        expenseCount: 1,
        shopping: [],
      },
    ],
    totals: { estimated: 2000, actual: 3200, remaining: -1200 },
    unconverted: [
      {
        currencyCode: 'XTS',
        expenseCount: 1,
        expenseTotal: 900000,
        estimateCount: 0,
        estimateTotal: 0,
        shoppingCount: 0,
        shoppingEstimated: 0,
        shoppingSpent: 0,
      },
    ],
    ratesAsOf: '2026-10-17T00:00:00+00:00',
    ratesUnavailable: false,
  };
}

function expense(): ExpenseResponse {
  return {
    id: '0199f0a1-7c00-7000-8000-000000000041',
    categoryId: movingId,
    taskId: null,
    description: 'Movers in Santiago',
    amount: 900000,
    currencyCode: 'CLP',
    convertedAmount: 900,
    paidOn: '2026-10-20',
    notes: null,
  };
}
