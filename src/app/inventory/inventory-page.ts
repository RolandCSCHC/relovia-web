import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type {
  AcquisitionStatus,
  BudgetCategoryResponse,
  InventoryItemResponse,
  ItemCategory,
  ItemPriority,
  ItemRoom,
  MovingAction,
  PackingStatus,
  SaveInventoryItemRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { failureMessage } from '../budget/api-failure';
import { currencies, formatMoney, parseAmount } from '../budget/money';
import { asCount } from '../relocations/dates';
import { labelFor } from '../relocations/labels';
import {
  acquisitions,
  itemCategories,
  itemFilters,
  itemPriorities,
  itemRooms,
  movingActions,
  packingStatuses,
  type ItemFilter,
} from './labels';

interface ItemDraft {
  id: string | null;
  name: string;
  category: '' | ItemCategory;
  room: '' | ItemRoom;
  quantity: string;
  acquisition: AcquisitionStatus;
  movingAction: '' | MovingAction;
  packingStatus: PackingStatus;
  priority: ItemPriority;
  estimatedPrice: string;
  actualPrice: string;
  currencyCode: string;
  budgetCategoryId: string;
  notes: string;
}

type TextField = 'name' | 'quantity' | 'estimatedPrice' | 'actualPrice' | 'notes';

interface RoomGroup {
  room: string;
  items: InventoryItemResponse[];
}

@Component({
  selector: 'app-inventory-page',
  imports: [MatButton, RouterLink],
  templateUrl: './inventory-page.html',
  styleUrl: './inventory-page.scss',
})
export class InventoryPage {
  private readonly api = inject(ReloviaClient);

  protected readonly acquisitions = acquisitions;
  protected readonly categories = itemCategories;
  protected readonly rooms = itemRooms;
  protected readonly movingActions = movingActions;
  protected readonly packingStatuses = packingStatuses;
  protected readonly priorities = itemPriorities;
  protected readonly filters = itemFilters;
  protected readonly currencies = currencies;
  protected readonly formatMoney = formatMoney;
  protected readonly labelFor = labelFor;
  protected readonly asCount = asCount;
  protected readonly filter = signal<ItemFilter>('All');
  protected readonly draft = signal<ItemDraft | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? undefined)),
  );

  protected readonly relocation = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getRelocation(params),
  });

  protected readonly items = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.listInventoryItems(params),
  });

  protected readonly budget = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getBudget(params),
  });

  protected readonly groups = computed(() => {
    if (!this.items.hasValue()) {
      return [];
    }

    return groupByRoom(matching(this.items.value(), this.filter()));
  });

  protected summary(items: readonly InventoryItemResponse[]): string {
    const total = items.length;
    const buying = items.filter((item) => item.acquisition === 'ToPurchase').length;
    const bringing = items.filter((item) => item.movingAction === 'Bring').length;
    const itemWord = total === 1 ? 'item' : 'items';
    return `${total} ${itemWord} · ${buying} to purchase · ${bringing} to bring`;
  }

  protected budgetCategoryName(id: string | null): string | null {
    if (!id || !this.budget.hasValue()) {
      return null;
    }

    return this.budget.value().categories.find((category) => category.id === id)?.name ?? null;
  }

  protected needsCurrency(draft: ItemDraft): boolean {
    return draft.estimatedPrice.trim().length > 0 || draft.actualPrice.trim().length > 0;
  }

  protected budgetCategories(): readonly BudgetCategoryResponse[] {
    return this.budget.hasValue() ? this.budget.value().categories : [];
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected setFilter(value: string): void {
    const match = itemFilters.find((option) => option.value === value);
    if (match) {
      this.filter.set(match.value);
    }
  }

  protected startAdd(): void {
    this.error.set(null);
    this.deletingId.set(null);
    this.draft.set({ ...emptyDraft(), budgetCategoryId: this.defaultBudgetCategoryId() });
  }

  protected startEdit(item: InventoryItemResponse): void {
    this.error.set(null);
    this.deletingId.set(null);
    this.draft.set({
      id: item.id,
      name: item.name,
      category: item.category ?? '',
      room: item.room ?? '',
      quantity: String(asCount(item.quantity)),
      acquisition: item.acquisition,
      movingAction: item.movingAction ?? '',
      packingStatus: item.packingStatus ?? 'NotPacked',
      priority: item.priority,
      estimatedPrice: item.estimatedPrice === null ? '' : String(item.estimatedPrice),
      actualPrice: item.actualPrice === null ? '' : String(item.actualPrice),
      currencyCode: item.currencyCode ?? '',
      budgetCategoryId: item.budgetCategoryId ?? this.defaultBudgetCategoryId(),
      notes: item.notes ?? '',
    });
  }

  protected updateText(field: TextField, value: string): void {
    this.draft.update((draft) => (draft ? { ...draft, [field]: value } : draft));
  }

  protected updateCategory(value: string): void {
    if (value !== '' && !itemCategories.some((option) => option.value === value)) {
      return;
    }

    const category = value as '' | ItemCategory;
    this.draft.update((draft) => (draft ? { ...draft, category } : draft));
  }

  protected updateRoom(value: string): void {
    if (value !== '' && !itemRooms.some((option) => option.value === value)) {
      return;
    }

    const room = value as '' | ItemRoom;
    this.draft.update((draft) => (draft ? { ...draft, room } : draft));
  }

  protected updateAcquisition(value: string): void {
    const match = acquisitions.find((option) => option.value === value);
    if (match) {
      this.draft.update((draft) =>
        draft
          ? {
              ...draft,
              acquisition: match.value,
              budgetCategoryId:
                match.value === 'ToPurchase'
                  ? draft.budgetCategoryId || this.defaultBudgetCategoryId()
                  : '',
            }
          : draft,
      );
    }
  }

  protected updateAction(value: string): void {
    if (value !== '' && !movingActions.some((option) => option.value === value)) {
      return;
    }

    const movingAction = value as '' | MovingAction;
    this.draft.update((draft) =>
      draft
        ? {
            ...draft,
            movingAction,
            packingStatus: movingAction === 'Bring' ? draft.packingStatus : 'NotPacked',
          }
        : draft,
    );
  }

  protected updatePacking(value: string): void {
    const match = packingStatuses.find((option) => option.value === value);
    if (match) {
      this.draft.update((draft) => (draft ? { ...draft, packingStatus: match.value } : draft));
    }
  }

  protected updatePriority(value: string): void {
    const match = itemPriorities.find((option) => option.value === value);
    if (match) {
      this.draft.update((draft) => (draft ? { ...draft, priority: match.value } : draft));
    }
  }

  protected updateCurrency(value: string): void {
    this.draft.update((draft) => (draft ? { ...draft, currencyCode: value } : draft));
  }

  protected updateBudgetCategory(value: string): void {
    if (!this.budgetCategories().some((category) => category.id === value)) {
      return;
    }

    this.draft.update((draft) => (draft ? { ...draft, budgetCategoryId: value } : draft));
  }

  protected cancel(): void {
    this.draft.set(null);
    this.error.set(null);
  }

  protected async save(): Promise<void> {
    const draft = this.draft();
    const relocationId = this.id();
    if (!draft || !relocationId) {
      return;
    }

    const problem = problemWith(draft, this.budgetCategories().length > 0);
    if (problem) {
      this.error.set(problem);
      return;
    }

    const body = toRequest(draft);
    this.saving.set(true);
    this.error.set(null);
    try {
      if (draft.id) {
        await this.api.updateInventoryItem(relocationId, draft.id, body);
      } else {
        await this.api.createInventoryItem(relocationId, body);
      }

      this.draft.set(null);
      this.items.reload();
    } catch (error) {
      this.error.set(failureMessage(error, 'The item could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(item: InventoryItemResponse): Promise<void> {
    const relocationId = this.id();
    if (!relocationId) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.deleteInventoryItem(relocationId, item.id);
      this.deletingId.set(null);
      this.items.reload();
    } catch (error) {
      this.error.set(failureMessage(error, 'The item could not be deleted.'));
    } finally {
      this.saving.set(false);
    }
  }

  private defaultBudgetCategoryId(): string {
    const categories = this.budgetCategories();
    return (
      categories.find((category) => category.name === 'Furnishing')?.id ?? categories[0]?.id ?? ''
    );
  }
}

function emptyDraft(): ItemDraft {
  return {
    id: null,
    name: '',
    category: '',
    room: '',
    quantity: '1',
    acquisition: 'Owned',
    movingAction: '',
    packingStatus: 'NotPacked',
    priority: 'Normal',
    estimatedPrice: '',
    actualPrice: '',
    currencyCode: '',
    budgetCategoryId: '',
    notes: '',
  };
}

function matching(
  items: readonly InventoryItemResponse[],
  filter: ItemFilter,
): InventoryItemResponse[] {
  if (filter === 'All') {
    return [...items];
  }

  if (filter === 'ToPurchase') {
    return items.filter((item) => item.acquisition === 'ToPurchase');
  }

  if (filter === 'Undecided') {
    return items.filter((item) => item.movingAction === null);
  }

  return items.filter((item) => item.movingAction === filter);
}

function groupByRoom(items: readonly InventoryItemResponse[]): RoomGroup[] {
  const byRoom = new Map<string, InventoryItemResponse[]>();
  for (const item of items) {
    const room = item.room ?? '';
    const list = byRoom.get(room) ?? [];
    list.push(item);
    byRoom.set(room, list);
  }

  return [...byRoom.entries()]
    .sort(([left], [right]) => roomOrder(left) - roomOrder(right))
    .map(([room, roomItems]) => ({
      room: room ? labelFor(itemRooms, room as ItemRoom) : 'No room',
      items: roomItems,
    }));
}

function roomOrder(room: string): number {
  if (!room) {
    return itemRooms.length + 1;
  }

  const index = itemRooms.findIndex((option) => option.value === room);
  return index === -1 ? itemRooms.length : index;
}

function problemWith(draft: ItemDraft, hasBudgetCategories: boolean): string | null {
  if (!draft.name.trim()) {
    return 'Name is required.';
  }

  if (readQuantity(draft.quantity) === null) {
    return 'Quantity must be a whole number from 1 to 100,000.';
  }

  const estimated = readOptionalPrice(draft.estimatedPrice);
  const actual = readOptionalPrice(draft.actualPrice);
  if (estimated === 'invalid' || actual === 'invalid') {
    return 'Enter an amount greater than zero.';
  }

  const hasPrice = estimated !== null || actual !== null;
  if (hasPrice && !draft.currencyCode) {
    return 'Choose a currency.';
  }

  if (!hasPrice && draft.currencyCode) {
    return 'Enter a price, or leave the currency empty.';
  }

  if (draft.acquisition === 'ToPurchase' && hasPrice && !draft.budgetCategoryId) {
    return hasBudgetCategories
      ? 'Choose a budget category.'
      : 'Set up the budget before adding a price.';
  }

  return null;
}

function toRequest(draft: ItemDraft): SaveInventoryItemRequest {
  const estimated = readOptionalPrice(draft.estimatedPrice);
  const actual = readOptionalPrice(draft.actualPrice);
  const estimatedPrice = typeof estimated === 'number' ? estimated : null;
  const actualPrice = typeof actual === 'number' ? actual : null;
  return {
    name: draft.name.trim(),
    category: draft.category || null,
    room: draft.room || null,
    quantity: readQuantity(draft.quantity) ?? 1,
    acquisition: draft.acquisition,
    movingAction: draft.movingAction || null,
    packingStatus: draft.movingAction === 'Bring' ? draft.packingStatus : null,
    priority: draft.priority,
    estimatedPrice,
    actualPrice,
    currencyCode: estimatedPrice !== null || actualPrice !== null ? draft.currencyCode : null,
    budgetCategoryId:
      draft.acquisition === 'ToPurchase' && draft.budgetCategoryId ? draft.budgetCategoryId : null,
    notes: draft.notes.trim() || null,
  };
}

function readQuantity(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const quantity = Number(trimmed);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) {
    return null;
  }

  return quantity;
}

function readOptionalPrice(text: string): number | null | 'invalid' {
  if (!text.trim()) {
    return null;
  }

  const amount = parseAmount(text);
  return amount === null ? 'invalid' : amount;
}
