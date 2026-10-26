import { Component, inject, resource, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type { HousingOptionResponse } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { failureMessage } from '../budget/api-failure';
import { currencies } from '../budget/money';
import { labelFor } from '../relocations/labels';
import { relocationId } from '../relocations/relocation-id';
import {
  emptyHousingDraft,
  furnishings,
  housingDraft,
  housingFacts,
  housingProblem,
  housingRequest,
  housingStatuses,
  type HousingInput,
} from './rules';

@Component({
  selector: 'app-housing-page',
  imports: [MatButton, RouterLink],
  templateUrl: './housing-page.html',
  styleUrl: './housing-page.scss',
})
export class HousingPage {
  private readonly api = inject(ReloviaClient);

  protected readonly currencies = currencies;
  protected readonly furnishings = furnishings;
  protected readonly housingStatuses = housingStatuses;
  protected readonly labelFor = labelFor;
  protected readonly facts = housingFacts;
  protected readonly adding = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly draft = signal<HousingInput | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly id = relocationId();

  protected readonly relocation = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getRelocation(params),
  });

  protected readonly homes = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.listHousing(params),
  });

  protected startAdd(): void {
    this.adding.set(true);
    this.editingId.set(null);
    this.deletingId.set(null);
    this.formError.set(null);
    this.draft.set(emptyHousingDraft());
  }

  protected startEdit(home: HousingOptionResponse): void {
    this.adding.set(false);
    this.editingId.set(home.id);
    this.deletingId.set(null);
    this.formError.set(null);
    this.draft.set(housingDraft(home));
  }

  protected closeDialog(): void {
    if (this.saving()) {
      return;
    }

    this.adding.set(false);
    this.editingId.set(null);
    this.formError.set(null);
  }

  protected updateDraft(
    key: 'name' | 'area' | 'rent' | 'deposit' | 'size' | 'availableOn' | 'notes',
    value: string,
  ): void {
    this.draft.update((draft) => (draft ? { ...draft, [key]: value } : draft));
  }

  protected updateChoice(key: 'currencyCode' | 'furnishing' | 'status', value: string): void {
    this.draft.update((draft) => (draft ? { ...draft, [key]: value } : draft));
  }

  protected async save(): Promise<void> {
    const id = this.id();
    const draft = this.draft();
    if (!id || !draft) {
      return;
    }

    const problem = housingProblem(draft);
    if (problem) {
      this.formError.set(problem);
      return;
    }

    const editingId = this.editingId();
    this.saving.set(true);
    this.formError.set(null);
    try {
      const body = housingRequest(draft);
      if (editingId) {
        await this.api.updateHousing(id, editingId, body);
      } else {
        await this.api.createHousing(id, body);
      }
      this.adding.set(false);
      this.editingId.set(null);
      this.homes.reload();
    } catch (error) {
      this.formError.set(failureMessage(error, 'The home could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(home: HousingOptionResponse): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.deleteHousing(id, home.id);
      this.deletingId.set(null);
      this.homes.reload();
    } catch (error) {
      this.error.set(failureMessage(error, 'The home could not be deleted.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
