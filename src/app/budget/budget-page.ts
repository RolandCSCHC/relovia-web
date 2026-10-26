import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { BudgetCategoryResponse, BudgetResponse } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { asCount, formatDate } from '../relocations/dates';
import { RelocationTabs } from '../relocations/relocation-tabs';
import { failureMessage } from './api-failure';
import { ExpenseSection } from './expense-section';
import { currencies, formatMoney, parseAmount, spentPercent, toAmount } from './money';

type Editor =
  | { kind: 'currency'; code: string }
  | { kind: 'category'; id: string | null; name: string }
  | {
      kind: 'estimate';
      categoryId: string;
      id: string | null;
      label: string;
      amount: string;
      currencyCode: string;
    };

interface ConfirmDelete {
  kind: 'category' | 'estimate';
  id: string;
}

@Component({
  selector: 'app-budget-page',
  imports: [ExpenseSection, MatButton, NgTemplateOutlet, RelocationTabs, RouterLink],
  templateUrl: './budget-page.html',
  styleUrl: './budget-page.scss',
})
export class BudgetPage {
  private readonly api = inject(ReloviaClient);

  protected readonly currencies = currencies;
  protected readonly formatMoney = formatMoney;
  protected readonly formatDate = formatDate;
  protected readonly spentPercent = spentPercent;
  protected readonly editor = signal<Editor | null>(null);
  protected readonly confirmDelete = signal<ConfirmDelete | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? undefined)),
  );

  protected readonly relocation = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getRelocation(params),
  });

  protected readonly budget = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getBudget(params),
  });

  protected readonly tasks = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.listTasks(params).then((response) => response.tasks),
  });

  protected readonly currencyEditor = computed(() => {
    const editor = this.editor();
    return editor?.kind === 'currency' ? editor : null;
  });

  protected readonly categoryEditor = computed(() => {
    const editor = this.editor();
    return editor?.kind === 'category' ? editor : null;
  });

  protected readonly estimateEditor = computed(() => {
    const editor = this.editor();
    return editor?.kind === 'estimate' ? editor : null;
  });

  protected isOver(category: { remaining: number | string }): boolean {
    return toAmount(category.remaining) < 0;
  }

  protected remainingLabel(remaining: number | string, currencyCode: string): string {
    const amount = toAmount(remaining);
    return amount < 0
      ? `${formatMoney(-amount, currencyCode)} over`
      : `${formatMoney(amount, currencyCode)} left`;
  }

  /** Names the amounts that have no exchange rate, so nothing is silently left out. */
  protected unconvertedNote(budget: BudgetResponse): string {
    return budget.unconverted
      .map((row) => {
        const parts: string[] = [];
        const expenses = asCount(row.expenseCount);
        const estimates = asCount(row.estimateCount);
        if (expenses > 0) {
          parts.push(
            `${formatMoney(row.expenseTotal, row.currencyCode)} spent (${expenses} ${expenses === 1 ? 'expense' : 'expenses'})`,
          );
        }

        if (estimates > 0) {
          parts.push(
            `${formatMoney(row.estimateTotal, row.currencyCode)} estimated (${estimates} ${estimates === 1 ? 'estimate' : 'estimates'})`,
          );
        }

        const shopping = asCount(row.shoppingCount);
        if (shopping > 0) {
          const money = [
            toAmount(row.shoppingEstimated) > 0
              ? `${formatMoney(row.shoppingEstimated, row.currencyCode)} estimated`
              : null,
            toAmount(row.shoppingSpent) > 0
              ? `${formatMoney(row.shoppingSpent, row.currencyCode)} spent`
              : null,
          ].filter((part) => part !== null);
          const itemWord = shopping === 1 ? 'item' : 'items';
          parts.push(`${money.join(' and ') || 'shopping'} (${shopping} ${itemWord} to buy)`);
        }

        return parts.join(' and ');
      })
      .join('; ');
  }

  /** The original amount, plus what it comes to in the budget currency when that differs. */
  protected converted(
    item: { currencyCode: string; convertedAmount: number | string | null },
    budgetCurrency: string,
  ): string | null {
    if (item.currencyCode === budgetCurrency) {
      return null;
    }

    return item.convertedAmount === null
      ? 'no exchange rate'
      : `≈ ${formatMoney(item.convertedAmount, budgetCurrency)}`;
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected open(editor: Editor): void {
    this.editor.set(editor);
    this.confirmDelete.set(null);
    this.error.set(null);
  }

  protected close(): void {
    this.editor.set(null);
    this.error.set(null);
  }

  protected openCurrency(budget: BudgetResponse): void {
    this.open({ kind: 'currency', code: budget.currencyCode ?? '' });
  }

  protected openEstimate(
    category: BudgetCategoryResponse,
    estimateId: string | null,
    budget: BudgetResponse,
  ): void {
    const estimate = category.estimates.find((item) => item.id === estimateId);
    this.open({
      kind: 'estimate',
      categoryId: category.id,
      id: estimate?.id ?? null,
      label: estimate?.label ?? '',
      amount: estimate ? String(estimate.amount) : '',
      currencyCode: estimate?.currencyCode ?? budget.currencyCode ?? '',
    });
  }

  protected askDelete(kind: ConfirmDelete['kind'], id: string): void {
    this.confirmDelete.set({ kind, id });
    this.editor.set(null);
    this.error.set(null);
  }

  protected isConfirming(kind: ConfirmDelete['kind'], id: string): boolean {
    const pending = this.confirmDelete();
    return pending?.kind === kind && pending.id === id;
  }

  protected setCode(code: string): void {
    // The first-time setup form has no editor open yet, so choosing a currency opens one.
    this.editor.set({ kind: 'currency', code });
    this.error.set(null);
  }

  protected setName(name: string): void {
    this.editor.update((editor) => (editor?.kind === 'category' ? { ...editor, name } : editor));
  }

  protected setLabel(label: string): void {
    this.editor.update((editor) => (editor?.kind === 'estimate' ? { ...editor, label } : editor));
  }

  protected setAmount(amount: string): void {
    this.editor.update((editor) => (editor?.kind === 'estimate' ? { ...editor, amount } : editor));
  }

  protected setEstimateCurrency(currencyCode: string): void {
    this.editor.update((editor) =>
      editor?.kind === 'estimate' ? { ...editor, currencyCode } : editor,
    );
  }

  protected async saveCurrency(): Promise<void> {
    const code = this.currencyEditor()?.code;
    const id = this.id();
    if (!id) {
      return;
    }

    if (!code) {
      this.error.set('Choose a currency.');
      return;
    }

    await this.run(async () => {
      await this.api.saveBudget(id, { currencyCode: code });
    }, 'The budget could not be saved.');
  }

  protected async saveCategory(): Promise<void> {
    const editor = this.categoryEditor();
    const id = this.id();
    if (!editor || !id) {
      return;
    }

    const name = editor.name.trim();
    if (!name) {
      this.error.set('Name is required.');
      return;
    }

    if (name.length > 100) {
      this.error.set('Name must be 100 characters or fewer.');
      return;
    }

    await this.run(async () => {
      if (editor.id) {
        await this.api.updateBudgetCategory(id, editor.id, { name });
      } else {
        await this.api.createBudgetCategory(id, { name });
      }
    }, 'The category could not be saved.');
  }

  protected async saveEstimate(): Promise<void> {
    const editor = this.estimateEditor();
    const id = this.id();
    if (!editor || !id) {
      return;
    }

    const label = editor.label.trim();
    const amount = parseAmount(editor.amount);
    if (!label) {
      this.error.set('Label is required.');
      return;
    }

    if (label.length > 200) {
      this.error.set('Label must be 200 characters or fewer.');
      return;
    }

    if (amount === null) {
      this.error.set('Enter an amount greater than zero.');
      return;
    }

    if (!editor.currencyCode) {
      this.error.set('Choose a currency.');
      return;
    }

    const body = {
      categoryId: editor.categoryId,
      label,
      amount,
      currencyCode: editor.currencyCode,
    };
    await this.run(async () => {
      if (editor.id) {
        await this.api.updateBudgetEstimate(id, editor.id, body);
      } else {
        await this.api.createBudgetEstimate(id, body);
      }
    }, 'The estimate could not be saved.');
  }

  protected async removeCategory(category: BudgetCategoryResponse): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }

    await this.run(
      () => this.api.deleteBudgetCategory(id, category.id),
      'The category could not be deleted.',
    );
  }

  protected async removeEstimate(estimateId: string): Promise<void> {
    const id = this.id();
    if (!id) {
      return;
    }

    await this.run(
      () => this.api.deleteBudgetEstimate(id, estimateId),
      'The estimate could not be deleted.',
    );
  }

  /** Runs a change, then closes any open form and refreshes the comparison. */
  private async run(action: () => Promise<void>, fallback: string): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await action();
      this.editor.set(null);
      this.confirmDelete.set(null);
      this.budget.reload();
    } catch (error) {
      this.error.set(failureMessage(error, fallback));
    } finally {
      this.saving.set(false);
    }
  }
}
