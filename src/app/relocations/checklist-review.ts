import { Component, effect, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { TaskPhase, TaskPriority } from '../api/generated';
import { ApiError, ReloviaClient } from '../api/relovia-client';
import { checklistSelection, draftsFromSuggestion, type DraftTask } from './checklist-draft';
import { dueOn, formatDate } from './dates';
import { phases, priorities } from './labels';

@Component({
  selector: 'app-checklist-review',
  imports: [MatButton, RouterLink],
  templateUrl: './checklist-review.html',
  styleUrl: './checklist-review.scss',
})
export class ChecklistReview {
  private readonly api = inject(ReloviaClient);
  private readonly router = inject(Router);
  private readonly draftsFor = signal<string | null>(null);

  protected readonly phases = phases;
  protected readonly priorities = priorities;
  protected readonly formatDate = formatDate;
  protected readonly drafts = signal<DraftTask[]>([]);
  protected readonly formErrors = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? undefined)),
  );

  protected readonly page = resource({
    params: () => this.id(),
    loader: async ({ params: id }) => {
      const [relocation, tasks] = await Promise.all([
        this.api.getRelocation(id),
        this.api.listTasks(id),
      ]);
      if (tasks.tasks.length > 0) {
        return { relocation, confirmed: true, suggestion: null };
      }

      const suggestion = await this.api.getChecklistSuggestion(id);
      return { relocation, confirmed: false, suggestion };
    },
  });

  constructor() {
    effect(() => {
      if (!this.page.hasValue()) {
        return;
      }

      const loaded = this.page.value();
      const id = this.id();
      if (loaded.confirmed || !loaded.suggestion || !id || this.draftsFor() === id) {
        return;
      }

      this.draftsFor.set(id);
      this.drafts.set(draftsFromSuggestion(loaded.suggestion.tasks));
    });
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected toggle(code: string, event: Event): void {
    const selected = (event.target as HTMLInputElement).checked;
    this.drafts.update((drafts) =>
      drafts.map((task) => (task.code === code ? { ...task, selected } : task)),
    );
  }

  protected update(code: string, key: 'title' | 'daysBeforeMove', value: string): void {
    this.drafts.update((drafts) =>
      drafts.map((task) => (task.code === code ? { ...task, [key]: value } : task)),
    );
  }

  protected updateChoice(code: string, key: 'phase' | 'priority', value: string): void {
    this.drafts.update((drafts) =>
      drafts.map((task) => {
        if (task.code !== code) {
          return task;
        }

        return key === 'phase'
          ? { ...task, phase: value as TaskPhase }
          : { ...task, priority: value as TaskPriority };
      }),
    );
  }

  protected due(targetDate: string | null, daysBeforeMove: string): string {
    if (!targetDate) {
      return 'Set a target date to give this a due date.';
    }

    return /^-?\d+$/.test(daysBeforeMove.trim())
      ? `Due ${formatDate(dueOn(targetDate, Number(daysBeforeMove)))}`
      : 'Set a whole number of days.';
  }

  protected dependencyNote(task: DraftTask): string {
    if (task.dependsOnCodes.length === 0) {
      return '';
    }

    const notes = task.dependsOnCodes.map((code) => {
      const match = this.drafts().find((item) => item.code === code);
      const title = match?.title.trim() || code;
      return match && !match.selected ? `${title} (not included)` : title;
    });
    return `After ${notes.join(', ')}`;
  }

  protected selectedCount(): number {
    return this.drafts().filter((task) => task.selected).length;
  }

  protected async confirm(): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }

    const selection = checklistSelection(this.drafts());
    if ('errors' in selection) {
      this.formErrors.set(selection.errors);
      return;
    }

    this.formErrors.set([]);
    this.saving.set(true);
    try {
      await this.api.confirmChecklist(id, { tasks: selection.tasks });
      await this.router.navigate(['/relocations', id]);
    } catch (error) {
      this.saving.set(false);
      const message =
        error instanceof ApiError ? error.message : 'The checklist could not be confirmed.';
      const details = error instanceof ApiError ? Object.values(error.fields) : [];
      this.formErrors.set(details.length > 0 ? details : [message]);
    }
  }
}
