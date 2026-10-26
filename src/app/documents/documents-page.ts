import { Component, inject, resource, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type { DocumentCategory, DocumentResponse, RelocationTaskResponse } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { failureMessage } from '../budget/api-failure';
import { formatDate } from '../relocations/dates';
import { labelFor } from '../relocations/labels';
import { relocationId } from '../relocations/relocation-id';
import { documentFileProblem, formatBytes, isExpired } from './file-rules';
import { documentCategories } from './labels';

interface DocumentDraft {
  category: '' | DocumentCategory;
  expiresOn: string;
  taskIds: string[];
}

interface UploadDraft extends DocumentDraft {
  file: File | null;
}

@Component({
  selector: 'app-documents-page',
  imports: [MatButton, RouterLink],
  templateUrl: './documents-page.html',
  styleUrl: './documents-page.scss',
})
export class DocumentsPage {
  private readonly api = inject(ReloviaClient);

  protected readonly categories = documentCategories;
  protected readonly formatBytes = formatBytes;
  protected readonly formatDate = formatDate;
  protected readonly isExpired = isExpired;
  protected readonly labelFor = labelFor;
  protected readonly adding = signal(false);
  protected readonly uploadDraft = signal<UploadDraft>(emptyUpload());
  protected readonly uploadError = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly draft = signal<DocumentDraft | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly id = relocationId();

  protected readonly relocation = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getRelocation(params),
  });

  protected readonly documents = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.listDocuments(params),
  });

  protected readonly tasks = resource({
    params: () => this.id(),
    loader: async ({ params }) => (await this.api.listTasks(params)).tasks,
  });

  protected supportedTitles(document: DocumentResponse): string {
    return document.taskIds.map((taskId) => this.taskTitle(taskId)).join(', ');
  }

  protected taskTitle(taskId: string): string {
    if (!this.tasks.hasValue()) {
      return 'Linked task';
    }

    return this.tasks.value().find((task) => task.id === taskId)?.title ?? 'Linked task';
  }

  protected startUpload(): void {
    this.adding.set(true);
    this.uploadError.set(null);
    this.uploadDraft.set(emptyUpload());
    this.editingId.set(null);
    this.deletingId.set(null);
  }

  protected closeUpload(): void {
    if (this.saving()) {
      return;
    }

    this.adding.set(false);
    this.uploadError.set(null);
  }

  protected rememberFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.uploadDraft.update((draft) => ({ ...draft, file }));
    this.uploadError.set(null);
  }

  protected updateUploadCategory(value: string): void {
    this.uploadDraft.update((draft) => ({
      ...draft,
      category: value as UploadDraft['category'],
    }));
  }

  protected updateUploadExpiresOn(value: string): void {
    this.uploadDraft.update((draft) => ({ ...draft, expiresOn: value }));
  }

  protected toggleUploadTask(taskId: string, checked: boolean): void {
    this.uploadDraft.update((draft) => {
      const taskIds = checked
        ? [...draft.taskIds, taskId]
        : draft.taskIds.filter((id) => id !== taskId);
      return { ...draft, taskIds };
    });
  }

  protected uploadSupports(task: RelocationTaskResponse): boolean {
    return this.uploadDraft().taskIds.includes(task.id);
  }

  protected async upload(): Promise<void> {
    const relocationId = this.id();
    const draft = this.uploadDraft();
    if (!relocationId) {
      return;
    }

    if (!draft.file) {
      this.uploadError.set('Choose a file.');
      return;
    }

    const problem = documentFileProblem(draft.file);
    if (problem) {
      this.uploadError.set(problem);
      return;
    }

    this.saving.set(true);
    this.uploadError.set(null);
    try {
      const created = await this.api.createDocument(relocationId, draft.file);
      if (draft.category || draft.expiresOn || draft.taskIds.length > 0) {
        await this.api.updateDocument(relocationId, created.id, {
          category: draft.category || null,
          expiresOn: draft.expiresOn || null,
          taskIds: [...draft.taskIds].sort(),
        });
      }

      this.adding.set(false);
      this.documents.reload();
    } catch (error) {
      this.uploadError.set(failureMessage(error, 'The file could not be uploaded.'));
      this.documents.reload();
    } finally {
      this.saving.set(false);
    }
  }

  protected startEdit(document: DocumentResponse): void {
    this.editingId.set(document.id);
    this.deletingId.set(null);
    this.error.set(null);
    this.draft.set({
      category: document.category ?? '',
      expiresOn: document.expiresOn ?? '',
      taskIds: [...document.taskIds],
    });
  }

  protected updateCategory(value: string): void {
    this.draft.update((draft) =>
      draft ? { ...draft, category: value as DocumentDraft['category'] } : draft,
    );
  }

  protected updateExpiresOn(value: string): void {
    this.draft.update((draft) => (draft ? { ...draft, expiresOn: value } : draft));
  }

  protected toggleTask(taskId: string, checked: boolean): void {
    this.draft.update((draft) => {
      if (!draft) {
        return draft;
      }

      const taskIds = checked
        ? [...draft.taskIds, taskId]
        : draft.taskIds.filter((id) => id !== taskId);
      return { ...draft, taskIds };
    });
  }

  protected async save(document: DocumentResponse): Promise<void> {
    const relocationId = this.id();
    const draft = this.draft();
    if (!relocationId || !draft) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.updateDocument(relocationId, document.id, {
        category: draft.category || null,
        expiresOn: draft.expiresOn || null,
        taskIds: [...draft.taskIds].sort(),
      });
      this.editingId.set(null);
      this.draft.set(null);
      this.documents.reload();
    } catch (error) {
      this.error.set(failureMessage(error, 'The document could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async download(document: DocumentResponse): Promise<void> {
    const relocationId = this.id();
    if (!relocationId) {
      return;
    }

    this.error.set(null);
    try {
      const blob = await this.api.downloadDocument(relocationId, document.id);
      const url = URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement('a');
      anchor.href = url;
      anchor.download = document.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.error.set(failureMessage(error, 'The file could not be downloaded.'));
    }
  }

  protected async remove(document: DocumentResponse): Promise<void> {
    const relocationId = this.id();
    if (!relocationId) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.deleteDocument(relocationId, document.id);
      this.deletingId.set(null);
      this.documents.reload();
    } catch (error) {
      this.error.set(failureMessage(error, 'The document could not be deleted.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected supports(task: RelocationTaskResponse): boolean {
    return this.draft()?.taskIds.includes(task.id) ?? false;
  }
}

function emptyUpload(): UploadDraft {
  return { file: null, category: '', expiresOn: '', taskIds: [] };
}
