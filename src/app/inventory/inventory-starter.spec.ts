import { TestBed } from '@angular/core/testing';
import type {
  ConfirmInventoryListRequest,
  Furnishing,
  InventorySuggestionResponse,
  ItemRoom,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { InventoryStarter } from './inventory-starter';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';

describe('InventoryStarter', () => {
  it('adds the checked items and leaves out the ones that were cleared', async () => {
    let confirmed: ConfirmInventoryListRequest | undefined;
    const fixture = await open({
      getInventorySuggestion: () => Promise.resolve(suggestion()),
      confirmInventoryList: (_id: string, body: ConfirmInventoryListRequest) => {
        confirmed = body;
        return Promise.resolve([]);
      },
    });
    const root = fixture.nativeElement as HTMLElement;
    let finished = false;
    fixture.componentInstance.confirmed.subscribe(() => {
      finished = true;
    });

    expect(root.textContent).toContain('Start from a list');
    setSelect(root.querySelector('#starter-furnishing'), 'Unfurnished');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.textContent).toContain('Kitchen');
    expect(root.textContent).toContain('Frying pan');
    expect(root.textContent).toContain('Living room');
    expect(root.textContent).toContain('× 4');

    const sofa = checkbox(root, 'Sofa');
    sofa.checked = false;
    sofa.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (root.querySelector('#starter-confirm') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(confirmed).toEqual({
      furnishing: 'Unfurnished',
      room: null,
      codes: ['frying-pan', 'plates'],
    });
    expect(finished).toBe(true);
  });

  it('limits the request to one room and says when that room has no list', async () => {
    let room: ItemRoom | null | undefined;
    const fixture = await open({
      getInventorySuggestion: (
        _id: string,
        _furnishing: Furnishing,
        requested: ItemRoom | null,
      ) => {
        room = requested;
        return Promise.resolve({
          furnishing: 'Furnished',
          room: requested,
          templateCodes: [],
          items: [],
        });
      },
    });
    const root = fixture.nativeElement as HTMLElement;

    setSelect(root.querySelector('#starter-furnishing'), 'Furnished');
    setSelect(root.querySelector('#starter-room'), 'LivingRoom');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(room).toBe('LivingRoom');
    expect(root.textContent).toContain('Nothing on this list.');
    expect(root.querySelector('#starter-confirm')).toBeNull();
  });

  it('says when every suggested item is already in the inventory', async () => {
    const fixture = await open({
      getInventorySuggestion: () =>
        Promise.resolve({
          furnishing: 'Unfurnished',
          room: null,
          templateCodes: ['kitchen-basics'],
          items: [],
        }),
    });
    const root = fixture.nativeElement as HTMLElement;

    setSelect(root.querySelector('#starter-furnishing'), 'Unfurnished');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.textContent).toContain('Everything on this list is already in your inventory.');
  });
});

async function open(
  overrides: Record<string, unknown>,
): Promise<ReturnType<typeof TestBed.createComponent<InventoryStarter>>> {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ReloviaClient,
        useValue: overrides,
      },
    ],
  });
  const fixture = TestBed.createComponent(InventoryStarter);
  fixture.componentRef.setInput('relocationId', relocationId);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function suggestion(): InventorySuggestionResponse {
  return {
    furnishing: 'Unfurnished',
    room: null,
    templateCodes: ['kitchen-basics', 'living-room'],
    items: [
      {
        code: 'frying-pan',
        name: 'Frying pan',
        category: 'Cookware',
        room: 'Kitchen',
        quantity: 1,
        priority: 'High',
        sourceTemplateItemId: '019a18b0-7c00-7000-8000-000000000121',
      },
      {
        code: 'plates',
        name: 'Plates',
        category: 'Cookware',
        room: 'Kitchen',
        quantity: 4,
        priority: 'Normal',
        sourceTemplateItemId: '019a18b0-7c00-7000-8000-000000000125',
      },
      {
        code: 'sofa',
        name: 'Sofa',
        category: 'Furniture',
        room: 'LivingRoom',
        quantity: 1,
        priority: 'High',
        sourceTemplateItemId: '019a18b0-7c00-7000-8000-000000000161',
      },
    ],
  };
}

function checkbox(root: HTMLElement, name: string): HTMLInputElement {
  const label = [...root.querySelectorAll('label.check')].find((item) =>
    item.textContent?.includes(name),
  );
  const input = label?.querySelector('input');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing checkbox ${name}`);
  }

  return input;
}

function setSelect(input: Element | null, value: string): void {
  if (!(input instanceof HTMLSelectElement)) {
    throw new Error('Missing select');
  }

  input.value = value;
  input.dispatchEvent(new Event('change'));
}
