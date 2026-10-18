import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  BudgetResponse,
  InventoryItemResponse,
  RelocationResponse,
  SaveInventoryItemRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { InventoryPage } from './inventory-page';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';
const furnishingId = '0199f0a1-7c00-7000-8000-000000000031';

describe('InventoryPage', () => {
  it('groups belongings by room and shows what each one is for', async () => {
    const harness = await open({
      listInventoryItems: () => Promise.resolve([lamp(), sofa()]),
    });
    const root = harness.routeNativeElement!;
    const rooms = [...root.querySelectorAll('.room')].map(
      (room) => room.querySelector('h2')?.textContent,
    );

    expect(root.textContent).toContain('2 items · 1 to purchase · 1 to bring');
    expect(rooms).toEqual(['Bedroom', 'Living room']);
    expect(root.textContent).toContain('To purchase');
    expect(root.textContent).toContain('Bring');
    expect(root.textContent).toContain('Packed');
    expect(root.textContent).toContain('× 2');
    expect(root.textContent).toMatch(/EUR \$.*1\D200/);
    expect(root.textContent).toContain('Warm light');
  });

  it('adds an item to bring and starts it as not packed', async () => {
    let created: SaveInventoryItemRequest | undefined;
    const harness = await open({
      listInventoryItems: () => Promise.resolve([]),
      createInventoryItem: (_id: string, body: SaveInventoryItemRequest) => {
        created = body;
        return Promise.resolve(sofa());
      },
    });
    const root = harness.routeNativeElement!;

    expect(root.textContent).toContain('Nothing here yet');
    clickButton(root, 'Add item');
    harness.detectChanges();
    setValue(root.querySelector('#item-name'), 'Sofa');
    setSelect(root.querySelector('#item-action'), 'Bring');
    harness.detectChanges();
    setValue(root.querySelector('#item-estimated'), '1200');
    harness.detectChanges();
    setSelect(root.querySelector('#item-currency'), 'EUR');
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(created).toEqual({
      name: 'Sofa',
      category: null,
      room: null,
      quantity: 1,
      acquisition: 'Owned',
      movingAction: 'Bring',
      packingStatus: 'NotPacked',
      priority: 'Normal',
      estimatedPrice: 1200,
      actualPrice: null,
      currencyCode: 'EUR',
      notes: null,
      budgetCategoryId: null,
    });
  });

  it('refuses a price without a currency before calling the API', async () => {
    let called = false;
    const harness = await open({
      listInventoryItems: () => Promise.resolve([]),
      createInventoryItem: () => {
        called = true;
        return Promise.resolve(sofa());
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add item');
    harness.detectChanges();
    setValue(root.querySelector('#item-name'), 'Lamp');
    setValue(root.querySelector('#item-estimated'), '40');
    harness.detectChanges();
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    harness.detectChanges();

    expect(called).toBe(false);
    expect(root.textContent).toContain('Choose a currency.');
  });

  it('counts a purchase in the Furnishing category', async () => {
    let created: SaveInventoryItemRequest | undefined;
    const harness = await open({
      listInventoryItems: () => Promise.resolve([]),
      createInventoryItem: (_id: string, body: SaveInventoryItemRequest) => {
        created = body;
        return Promise.resolve(lamp());
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add item');
    harness.detectChanges();
    setValue(root.querySelector('#item-name'), 'Lamp');
    setSelect(root.querySelector('#item-acquisition'), 'ToPurchase');
    setSelect(root.querySelector('#item-category'), 'Appliances');
    setSelect(root.querySelector('#item-room'), 'Kitchen');
    harness.detectChanges();
    setValue(root.querySelector('#item-estimated'), '45.5');
    harness.detectChanges();
    setSelect(root.querySelector('#item-currency'), 'USD');
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(created?.acquisition).toBe('ToPurchase');
    expect(created?.category).toBe('Appliances');
    expect(created?.room).toBe('Kitchen');
    expect(created?.budgetCategoryId).toBe(furnishingId);
    expect(created?.estimatedPrice).toBe(45.5);
    expect(created?.currencyCode).toBe('USD');
  });

  it('asks for a budget before a purchase price can be saved', async () => {
    let called = false;
    const harness = await open({
      getBudget: () =>
        Promise.resolve({
          currencyCode: 'EUR',
          categories: [],
          totals: { estimated: 0, actual: 0, remaining: 0 },
          unconverted: [],
          ratesAsOf: null,
          ratesUnavailable: false,
        }),
      listInventoryItems: () => Promise.resolve([]),
      createInventoryItem: () => {
        called = true;
        return Promise.resolve(lamp());
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add item');
    harness.detectChanges();
    setValue(root.querySelector('#item-name'), 'Lamp');
    setSelect(root.querySelector('#item-acquisition'), 'ToPurchase');
    harness.detectChanges();
    setValue(root.querySelector('#item-estimated'), '40');
    harness.detectChanges();
    setSelect(root.querySelector('#item-currency'), 'EUR');
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    harness.detectChanges();

    expect(called).toBe(false);
    expect(root.textContent).toContain('Set up the budget before adding a price.');
  });

  it('filters to the items being brought', async () => {
    const harness = await open({
      listInventoryItems: () => Promise.resolve([lamp(), sofa()]),
    });
    const root = harness.routeNativeElement!;

    setSelect(root.querySelector('#inventory-filter'), 'Bring');
    harness.detectChanges();

    expect(root.textContent).toContain('Sofa');
    expect(root.textContent).not.toContain('Lamp');
  });

  it('edits an item and can delete it', async () => {
    let updated: SaveInventoryItemRequest | undefined;
    let deleted: string | undefined;
    const harness = await open({
      listInventoryItems: () => Promise.resolve([sofa()]),
      updateInventoryItem: (_id: string, _itemId: string, body: SaveInventoryItemRequest) => {
        updated = body;
        return Promise.resolve({ ...sofa(), ...body, id: sofa().id });
      },
      deleteInventoryItem: (_id: string, itemId: string) => {
        deleted = itemId;
        return Promise.resolve();
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Edit');
    harness.detectChanges();
    setSelect(root.querySelector('#item-action'), 'Sell');
    harness.detectChanges();
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(updated?.movingAction).toBe('Sell');
    expect(updated?.packingStatus).toBeNull();
    expect(root.querySelector('#item-packing')).toBeNull();

    clickButton(root, 'Delete');
    harness.detectChanges();
    clickButton(root, 'Delete item');
    await harness.fixture.whenStable();

    expect(deleted).toBe(sofa().id);
  });
});

async function open(overrides: Record<string, unknown>): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'relocations/:id/inventory', component: InventoryPage }]),
      {
        provide: ReloviaClient,
        useValue: {
          getRelocation: () => Promise.resolve(relocation()),
          getBudget: () => Promise.resolve(budget()),
          listInventoryItems: () => Promise.resolve([]),
          ...overrides,
        },
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/relocations/${relocationId}/inventory`);
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
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
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

function budget(): BudgetResponse {
  return {
    currencyCode: 'EUR',
    categories: [
      {
        id: furnishingId,
        name: 'Furnishing',
        estimates: [],
        estimated: 0,
        actual: 0,
        remaining: 0,
        expenseCount: 0,
        shopping: [],
      },
      {
        id: '0199f0a1-7c00-7000-8000-000000000032',
        name: 'Housing',
        estimates: [],
        estimated: 0,
        actual: 0,
        remaining: 0,
        expenseCount: 0,
        shopping: [],
      },
    ],
    totals: { estimated: 0, actual: 0, remaining: 0 },
    unconverted: [],
    ratesAsOf: null,
    ratesUnavailable: false,
  };
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

function sofa(): InventoryItemResponse {
  return {
    id: '0199f0a1-7c00-7000-8000-000000000041',
    name: 'Sofa',
    category: 'Furniture',
    room: 'LivingRoom',
    quantity: 1,
    acquisition: 'Owned',
    movingAction: 'Bring',
    packingStatus: 'Packed',
    priority: 'High',
    estimatedPrice: 1200,
    actualPrice: 1100,
    currencyCode: 'EUR',
    budgetCategoryId: null,
    notes: null,
    code: null,
    sourceTemplateItemId: null,
  };
}

function lamp(): InventoryItemResponse {
  return {
    id: '0199f0a1-7c00-7000-8000-000000000042',
    name: 'Lamp',
    category: null,
    room: 'Bedroom',
    quantity: 2,
    acquisition: 'ToPurchase',
    movingAction: null,
    packingStatus: null,
    priority: 'Normal',
    estimatedPrice: null,
    actualPrice: null,
    currencyCode: null,
    budgetCategoryId: null,
    notes: 'Warm light',
    code: null,
    sourceTemplateItemId: null,
  };
}
