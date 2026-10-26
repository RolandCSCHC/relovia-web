import { Component, inject, resource, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type {
  RelocationResponse,
  RelocationTaskResponse,
  RelocationTaskStatus,
  TaskPhase,
  TaskPriority,
} from '../api/generated';
import { ApiError, ReloviaClient } from '../api/relovia-client';
import { formatDate } from './dates';
import { labelFor, phases, priorities, purposes, relocationStatuses, taskStatuses } from './labels';
import { relocationId } from './relocation-id';
import { TaskProgress } from './task-progress';

@Component({
  selector: 'app-relocation-page',
  imports: [MatButton, RouterLink, TaskProgress],
  templateUrl: './relocation-page.html',
  styleUrl: './relocation-page.scss',
})
export class RelocationPage {
  private readonly api = inject(ReloviaClient);

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
  protected readonly id = relocationId();

  protected readonly relocation = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getRelocation(params),
  });

  protected readonly tasks = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.listTasks(params),
  });

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

  protected documentLabel(task: RelocationTaskResponse): string {
    return task.documentIds.length === 1 ? '1 document' : `${task.documentIds.length} documents`;
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

  protected updateAdd(key: 'title' | 'dueDate' | 'description' | 'url', value: string): void {
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

    const draft = this.addDraft();
    const titleError = titleProblem(title);
    const noteError = detailProblem(draft);
    if (titleError || noteError) {
      this.addError.set(titleError ?? noteError);
      return;
    }

    this.saving.set(true);
    this.addError.set(null);
    try {
      await this.api.createTask(id, {
        title,
        dueDate: draft.dueDate || null,
        phase: draft.phase,
        priority: draft.priority,
        description: blankToNull(draft.description),
        url: blankToNull(draft.url),
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
      description: task.description ?? '',
      url: task.url ?? '',
    });
  }

  protected editValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected updateEdit(key: 'title' | 'dueDate' | 'description' | 'url', value: string): void {
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
        description: task.description,
        url: task.url,
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
    const noteError = detailProblem(draft);
    if (titleError || noteError) {
      this.editError.set(titleError ?? noteError);
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
        description: blankToNull(draft.description),
        url: blankToNull(draft.url),
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

  private failure(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
  }
}

function emptyTaskDraft(): {
  title: string;
  dueDate: string;
  phase: TaskPhase;
  priority: TaskPriority;
  description: string;
  url: string;
} {
  return {
    title: '',
    dueDate: '',
    phase: phases[0].value,
    priority: priorities[1].value,
    description: '',
    url: '',
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

function detailProblem(draft: { description: string; url: string }): string | null {
  const description = draft.description.trim();
  if (description.length > 1000) {
    return 'Description must be 1000 characters or fewer.';
  }

  const url = draft.url.trim();
  if (url.length > 2048) {
    return 'Link must be 2048 characters or fewer.';
  }

  if (url.length > 0 && !isWebAddress(url)) {
    return 'Link must be an absolute http or https address.';
  }

  return null;
}

function isWebAddress(value: string): boolean {
  if (/\s/.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
