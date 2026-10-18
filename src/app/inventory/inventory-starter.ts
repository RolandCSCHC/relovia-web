import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  resource,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import type {
  ConfirmInventoryListRequest,
  Furnishing,
  ItemRoom,
  SuggestedInventoryItemResponse,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { failureMessage } from '../budget/api-failure';
import { asCount } from '../relocations/dates';
import { labelFor } from '../relocations/labels';
import { furnishings, itemCategories, itemRooms } from './labels';

interface SuggestedDraft extends SuggestedInventoryItemResponse {
  selected: boolean;
}

interface RoomGroup {
  room: string;
  items: SuggestedDraft[];
}

@Component({
  selector: 'app-inventory-starter',
  imports: [MatButton],
  templateUrl: './inventory-starter.html',
  styleUrl: './inventory-starter.scss',
})
export class InventoryStarter {
  private readonly api = inject(ReloviaClient);
  private readonly draftsFor = signal<string | null>(null);

  readonly relocationId = input.required<string>();
  readonly closed = output<void>();
  readonly confirmed = output<void>();

  protected readonly furnishings = furnishings;
  protected readonly rooms = itemRooms;
  protected readonly categories = itemCategories;
  protected readonly labelFor = labelFor;
  protected readonly asCount = asCount;
  protected readonly furnishing = signal<Furnishing | null>(null);
  protected readonly room = signal<'' | ItemRoom>('');
  protected readonly drafts = signal<SuggestedDraft[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedCount = computed(
    () => this.drafts().filter((item) => item.selected).length,
  );
  protected readonly groups = computed(() => groupByRoom(this.drafts()));

  protected readonly suggestion = resource({
    params: () => {
      const furnishing = this.furnishing();
      if (!furnishing) {
        return undefined;
      }

      return {
        relocationId: this.relocationId(),
        furnishing,
        room: this.room(),
      };
    },
    loader: ({ params }) =>
      this.api.getInventorySuggestion(params.relocationId, params.furnishing, params.room || null),
  });

  constructor() {
    effect(() => {
      if (!this.suggestion.hasValue()) {
        return;
      }

      const loaded = this.suggestion.value();
      const key = `${loaded.furnishing}|${loaded.room ?? ''}|${loaded.items.map((item) => item.code).join(',')}`;
      if (this.draftsFor() === key) {
        return;
      }

      this.draftsFor.set(key);
      this.drafts.set(loaded.items.map((item) => ({ ...item, selected: true })));
    });
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected chooseFurnishing(value: string): void {
    this.error.set(null);
    if (value !== 'Furnished' && value !== 'Unfurnished') {
      this.furnishing.set(null);
      this.drafts.set([]);
      this.draftsFor.set(null);
      return;
    }

    this.furnishing.set(value);
  }

  protected chooseRoom(value: string): void {
    if (value !== '' && !itemRooms.some((option) => option.value === value)) {
      return;
    }

    this.error.set(null);
    this.room.set(value as '' | ItemRoom);
  }

  protected toggle(code: string, event: Event): void {
    const selected = (event.target as HTMLInputElement).checked;
    this.drafts.update((drafts) =>
      drafts.map((item) => (item.code === code ? { ...item, selected } : item)),
    );
  }

  protected async confirm(): Promise<void> {
    const furnishing = this.furnishing();
    if (!furnishing || this.selectedCount() === 0 || this.saving()) {
      return;
    }

    const body: ConfirmInventoryListRequest = {
      furnishing,
      room: this.room() || null,
      codes: this.drafts()
        .filter((item) => item.selected)
        .map((item) => item.code),
    };
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.confirmInventoryList(this.relocationId(), body);
      this.confirmed.emit();
    } catch (error) {
      this.error.set(failureMessage(error, 'The list could not be added.'));
    } finally {
      this.saving.set(false);
    }
  }
}

function groupByRoom(items: readonly SuggestedDraft[]): RoomGroup[] {
  const byRoom = new Map<ItemRoom, SuggestedDraft[]>();
  for (const item of items) {
    const list = byRoom.get(item.room) ?? [];
    list.push(item);
    byRoom.set(item.room, list);
  }

  return [...byRoom.entries()].map(([room, group]) => ({
    room: labelFor(itemRooms, room),
    items: group,
  }));
}
