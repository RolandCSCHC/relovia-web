import { Component, inject, resource, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type { JobApplicationResponse } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { failureMessage } from '../budget/api-failure';
import { labelFor } from '../relocations/labels';
import { relocationId } from '../relocations/relocation-id';
import {
  applicationDraft,
  applicationFacts,
  applicationProblem,
  applicationRequest,
  applicationStatuses,
  emptyApplicationDraft,
  type ApplicationInput,
} from './rules';

@Component({
  selector: 'app-applications-page',
  imports: [MatButton, RouterLink],
  templateUrl: './applications-page.html',
  styleUrl: './applications-page.scss',
})
export class ApplicationsPage {
  private readonly api = inject(ReloviaClient);

  protected readonly applicationStatuses = applicationStatuses;
  protected readonly labelFor = labelFor;
  protected readonly facts = applicationFacts;
  protected readonly adding = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly draft = signal<ApplicationInput | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly id = relocationId();

  protected readonly relocation = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getRelocation(params),
  });

  protected readonly applications = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.listApplications(params),
  });

  protected startAdd(): void {
    this.adding.set(true);
    this.editingId.set(null);
    this.deletingId.set(null);
    this.formError.set(null);
    this.draft.set(emptyApplicationDraft());
  }

  protected startEdit(application: JobApplicationResponse): void {
    this.adding.set(false);
    this.editingId.set(application.id);
    this.deletingId.set(null);
    this.formError.set(null);
    this.draft.set(applicationDraft(application));
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
    key: 'employer' | 'role' | 'location' | 'appliedOn' | 'nextOn' | 'notes',
    value: string,
  ): void {
    this.draft.update((draft) => (draft ? { ...draft, [key]: value } : draft));
  }

  protected updateChoice(key: 'status' | 'includesSupport', value: string): void {
    this.draft.update((draft) => (draft ? { ...draft, [key]: value } : draft));
  }

  protected async save(): Promise<void> {
    const id = this.id();
    const draft = this.draft();
    if (!id || !draft) {
      return;
    }

    const problem = applicationProblem(draft);
    if (problem) {
      this.formError.set(problem);
      return;
    }

    const editingId = this.editingId();
    this.saving.set(true);
    this.formError.set(null);
    try {
      const body = applicationRequest(draft);
      if (editingId) {
        await this.api.updateApplication(id, editingId, body);
      } else {
        await this.api.createApplication(id, body);
      }
      this.adding.set(false);
      this.editingId.set(null);
      this.applications.reload();
    } catch (error) {
      this.formError.set(failureMessage(error, 'The application could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(application: JobApplicationResponse): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.deleteApplication(id, application.id);
      this.deletingId.set(null);
      this.applications.reload();
    } catch (error) {
      this.error.set(failureMessage(error, 'The application could not be deleted.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
