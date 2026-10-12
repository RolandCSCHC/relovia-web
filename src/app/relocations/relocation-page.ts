import { Component, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type {
  RelocationResponse,
  RelocationTaskResponse,
  RelocationTaskStatus,
  TaskPhase,
  TaskPriority,
} from '../api/generated';
import { ApiError, ReloviaClient } from '../api/relovia-client';
import { countryName } from './countries';
import { formatDate } from './dates';
import { labelFor, phases, priorities, purposes, relocationStatuses, taskStatuses } from './labels';
import { TaskProgress } from './task-progress';

@Component({
  selector: 'app-relocation-page',
  imports: [MatButton, RouterLink, TaskProgress],
  templateUrl: './relocation-page.html',
  styleUrl: './relocation-page.scss',
})
export class RelocationPage {
  private readonly api = inject(ReloviaClient);
  private readonly router = inject(Router);

  protected readonly formatDate = formatDate;
  protected readonly phases = phases;
  protected readonly priorities = priorities;
  protected readonly taskStatuses = taskStatuses;
  protected readonly editingId = signal<string | null>(null);
  protected readonly editDraft = signal(emptyTaskDraft());
  protected readonly editError = signal<string | null>(null);
  protected readonly adding = signal(false);
  protected readonly addDraft = signal(emptyTaskDraft());
  protected readonly addError = signal<string | null>(null);
  protected readonly deletingTaskId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly confirmingDelete = signal(false);
  protected readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? undefined)),
  );

  protected readonly relocation = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getRelocation(params),
  });

  protected readonly tasks = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.listTasks(params),
  });

  protected place(relocation: RelocationResponse, end: 'origin' | 'destination'): string {
    const city = end === 'origin' ? relocation.originCity : relocation.destinationCity;
    const country =
      end === 'origin' ? relocation.originCountryCode : relocation.destinationCountryCode;
    return city.trim() ? `${city}, ${countryName(country)}` : countryName(country);
  }

  protected summary(relocation: RelocationResponse): string {
    const scope = relocation.isInternational ? 'International' : 'Domestic';
    return [
      relocation.targetDate ? formatDate(relocation.targetDate) : null,
      scope,
      labelFor(purposes, relocation.purpose),
      labelFor(relocationStatuses, relocation.status),
    ]
      .filter((part) => part !== null)
      .join(' · ');
  }

  protected phaseLabel(task: RelocationTaskResponse): string {
    return labelFor(phases, task.phase);
  }

  protected priorityLabel(task: RelocationTaskResponse): string {
    return labelFor(priorities, task.priority);
  }

  protected dependencyNote(
    task: RelocationTaskResponse,
    tasks: readonly RelocationTaskResponse[],
  ): string {
    if (task.dependencies.length === 0) {
      return '';
    }

    const notes = task.dependencies.map((dependency) => {
      const title = tasks.find((item) => item.id === dependency.taskId)?.title ?? dependency.code;
      return dependency.isSatisfied ? title : `${title} (waiting)`;
    });
    return `After ${notes.join(', ')}`;
  }

  protected startAdd(): void {
    this.adding.set(true);
    this.addError.set(null);
    this.addDraft.set(emptyTaskDraft());
    this.editingId.set(null);
    this.deletingTaskId.set(null);
  }

  protected updateAdd(key: 'title' | 'dueDate', value: string): void {
    this.addDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  protected updateAddPhase(value: string): void {
    this.addDraft.update((draft) => ({ ...draft, phase: value as TaskPhase }));
  }

  protected updateAddPriority(value: string): void {
    this.addDraft.update((draft) => ({ ...draft, priority: value as TaskPriority }));
  }

  protected async saveAdd(): Promise<void> {
    const id = this.id();
    const title = this.addDraft().title.trim();
    if (!id) {
      return;
    }

    const titleError = titleProblem(title);
    if (titleError) {
      this.addError.set(titleError);
      return;
    }

    this.saving.set(true);
    this.addError.set(null);
    try {
      const draft = this.addDraft();
      await this.api.createTask(id, {
        title,
        dueDate: draft.dueDate || null,
        phase: draft.phase,
        priority: draft.priority,
      });
      this.adding.set(false);
      this.tasks.reload();
    } catch (error) {
      this.addError.set(this.failure(error, 'The task could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected startEdit(task: RelocationTaskResponse): void {
    this.editingId.set(task.id);
    this.adding.set(false);
    this.deletingTaskId.set(null);
    this.editError.set(null);
    this.editDraft.set({
      title: task.title,
      dueDate: task.dueDate ?? '',
      phase: task.phase,
      priority: task.priority,
    });
  }

  protected editValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected updateEdit(key: 'title' | 'dueDate', value: string): void {
    this.editDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  protected updatePhase(value: string): void {
    this.editDraft.update((draft) => ({ ...draft, phase: value as TaskPhase }));
  }

  protected updatePriority(value: string): void {
    this.editDraft.update((draft) => ({ ...draft, priority: value as TaskPriority }));
  }

  protected async changeStatus(task: RelocationTaskResponse, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const status = select.value as RelocationTaskStatus;
    const id = this.id();
    if (!id || status === task.status) {
      return;
    }

    this.actionError.set(null);
    this.saving.set(true);
    try {
      await this.api.updateTask(id, task.id, {
        title: task.title,
        dueDate: task.dueDate,
        phase: task.phase,
        priority: task.priority,
        status,
      });
      this.tasks.reload();
    } catch (error) {
      select.value = task.status;
      this.actionError.set(this.failure(error, 'The task could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async saveEdit(task: RelocationTaskResponse): Promise<void> {
    const id = this.id();
    const draft = this.editDraft();
    const title = draft.title.trim();
    if (!id) {
      return;
    }

    const titleError = titleProblem(title);
    if (titleError) {
      this.editError.set(titleError);
      return;
    }

    this.saving.set(true);
    this.editError.set(null);
    try {
      await this.api.updateTask(id, task.id, {
        title,
        dueDate: draft.dueDate || null,
        phase: draft.phase,
        priority: draft.priority,
        status: task.status,
      });
      this.editingId.set(null);
      this.tasks.reload();
    } catch (error) {
      this.editError.set(this.failure(error, 'The task could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeTask(task: RelocationTaskResponse): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);
    try {
      await this.api.deleteTask(id, task.id);
      this.deletingTaskId.set(null);
      this.tasks.reload();
    } catch (error) {
      this.actionError.set(this.failure(error, 'The task could not be deleted.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.actionError.set(null);
    try {
      await this.api.deleteRelocation(id);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.saving.set(false);
      this.actionError.set(this.failure(error, 'The relocation could not be deleted.'));
    }
  }

  private failure(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
  }
}

function emptyTaskDraft(): {
  title: string;
  dueDate: string;
  phase: TaskPhase;
  priority: TaskPriority;
} {
  return {
    title: '',
    dueDate: '',
    phase: phases[0].value,
    priority: priorities[1].value,
  };
}

function titleProblem(title: string): string | null {
  if (!title) {
    return 'Title is required.';
  }

  if (title.length > 200) {
    return 'Title must be 200 characters or fewer.';
  }

  return null;
}
