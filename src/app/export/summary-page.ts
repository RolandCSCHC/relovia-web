import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ReloviaClient } from '../api/relovia-client';
import { failureMessage } from '../budget/api-failure';
import { TaskProgress } from '../relocations/task-progress';
import { savePdf, summaryPdfFileName } from './file-name';
import { buildSummary } from './summary';

@Component({
  selector: 'app-summary-page',
  imports: [MatButton, RouterLink, TaskProgress],
  templateUrl: './summary-page.html',
  styleUrl: './summary-page.scss',
})
export class SummaryPage {
  private readonly api = inject(ReloviaClient);

  protected readonly downloading = signal(false);
  protected readonly downloadError = signal<string | null>(null);
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

  protected readonly budget = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getBudget(params),
  });

  protected readonly items = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.listInventoryItems(params),
  });

  protected readonly calendar = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getCalendar(params),
  });

  protected readonly documents = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.listDocuments(params),
  });

  protected readonly problem = computed(() => {
    return (
      this.relocation.error()?.message ??
      this.tasks.error()?.message ??
      this.budget.error()?.message ??
      this.items.error()?.message ??
      this.calendar.error()?.message ??
      this.documents.error()?.message ??
      null
    );
  });

  protected readonly sheet = computed(() => {
    if (
      !this.relocation.hasValue() ||
      !this.tasks.hasValue() ||
      !this.budget.hasValue() ||
      !this.items.hasValue() ||
      !this.calendar.hasValue() ||
      !this.documents.hasValue()
    ) {
      return null;
    }

    return buildSummary({
      relocation: this.relocation.value(),
      tasks: this.tasks.value(),
      budget: this.budget.value(),
      items: this.items.value(),
      calendar: this.calendar.value(),
      documents: this.documents.value(),
    });
  });

  protected async downloadPdf(): Promise<void> {
    const sheet = this.sheet();
    if (!sheet) {
      return;
    }

    this.downloading.set(true);
    this.downloadError.set(null);
    try {
      const blob = await this.api.downloadSummaryPdf(sheet.id);
      savePdf(blob, summaryPdfFileName(sheet.name));
    } catch (error) {
      this.downloadError.set(failureMessage(error, 'The PDF could not be downloaded.'));
    } finally {
      this.downloading.set(false);
    }
  }
}
