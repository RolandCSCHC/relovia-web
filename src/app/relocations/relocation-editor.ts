import { Component, effect, inject, resource, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import type { RelocationPurpose, RelocationStatus } from '../api/generated';
import { ApiError, ReloviaClient } from '../api/relovia-client';
import { countries } from './countries';
import { purposes, relocationStatuses } from './labels';
import {
  emptyRelocationDraft,
  relocationErrors,
  relocationRequest,
  type RelocationDraft,
} from './relocation-draft';

@Component({
  selector: 'app-relocation-editor',
  imports: [MatButton, RouterLink],
  templateUrl: './relocation-editor.html',
})
export class RelocationEditor {
  private readonly api = inject(ReloviaClient);
  private readonly router = inject(Router);
  private readonly filledFor = signal<string | null>(null);

  protected readonly countries = countries;
  protected readonly purposes = purposes;
  protected readonly statuses = relocationStatuses;
  protected readonly draft = signal(emptyRelocationDraft());
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id'))),
  );

  protected readonly existing = resource({
    params: () => this.id() ?? undefined,
    loader: ({ params }) => this.api.getRelocation(params),
  });

  constructor() {
    effect(() => {
      if (!this.existing.hasValue()) {
        return;
      }

      const relocation = this.existing.value();
      const id = this.id();
      if (!id || this.filledFor() === id) {
        return;
      }

      this.filledFor.set(id);
      this.draft.set({
        name: relocation.name,
        originCountryCode: relocation.originCountryCode,
        originCity: relocation.originCity,
        destinationCountryCode: relocation.destinationCountryCode,
        destinationCity: relocation.destinationCity,
        targetDate: relocation.targetDate ?? '',
        purpose: relocation.purpose,
        status: relocation.status,
      });
    });
  }

  protected update<K extends keyof RelocationDraft>(key: K, value: RelocationDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
    this.fieldErrors.update((errors) => {
      if (!(key in errors)) {
        return errors;
      }

      const next = { ...errors };
      delete next[key];
      return next;
    });
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected purposeOf(event: Event): RelocationPurpose {
    return this.valueOf(event) as RelocationPurpose;
  }

  protected statusOf(event: Event): RelocationStatus {
    return this.valueOf(event) as RelocationStatus;
  }

  protected updateCountry(key: 'originCountryCode' | 'destinationCountryCode', event: Event): void {
    this.update(key, this.valueOf(event).toUpperCase());
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const errors = relocationErrors(this.draft());
    this.fieldErrors.set(errors);
    this.formError.set(null);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const id = this.id();
    const body = relocationRequest(this.draft());
    this.saving.set(true);
    try {
      if (id) {
        await this.api.updateRelocation(id, body);
        await this.router.navigate(['/relocations', id]);
      } else {
        const created = await this.api.createRelocation(body);
        await this.router.navigate(['/relocations', created.id, 'checklist']);
      }
    } catch (error) {
      this.saving.set(false);
      if (error instanceof ApiError) {
        this.fieldErrors.set(error.fields);
        this.formError.set(Object.keys(error.fields).length > 0 ? null : error.message);
        return;
      }

      this.formError.set('The relocation could not be saved.');
    }
  }
}
