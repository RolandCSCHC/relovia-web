import { Component, computed, inject, input, output, resource, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import type { BudgetResponse, ExpenseResponse, RelocationTaskResponse } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { formatDate } from '../relocations/dates';
import { failureMessage } from './api-failure';
import { currencies, formatMoney, parseAmount } from './money';

interface ExpenseDraft {
  id: string | null;
  description: string;
  amount: string;
  currencyCode: string;
  categoryId: string;
  paidOn: string;
  taskId: string;
  notes: string;
}

type DraftField =
  'description' | 'amount' | 'currencyCode' | 'categoryId' | 'paidOn' | 'taskId' | 'notes';

@Component({
  selector: 'app-expense-section',
  imports: [MatButton],
  templateUrl: './expense-section.html',
  styleUrl: './expense-section.scss',
})
export class ExpenseSection {
  private readonly api = inject(ReloviaClient);

  readonly relocationId = input.required<string>();
  readonly budget = input.required<BudgetResponse>();
  readonly tasks = input.required<readonly RelocationTaskResponse[]>();
  /** Emitted after any change, so the page can refresh the comparison. */
  readonly changed = output<void>();

  protected readonly currencies = currencies;
  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly draft = signal<ExpenseDraft | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly expenses = resource({
    params: () => this.relocationId(),
    loader: ({ params }) => this.api.listExpenses(params),
  });

  private readonly categoryNames = computed(
    () => new Map(this.budget().categories.map((category) => [category.id, category.name])),
  );

  private readonly taskTitles = computed(
    () => new Map(this.tasks().map((task) => [task.id, task.title])),
  );

  protected categoryName(expense: ExpenseResponse): string {
    return this.categoryNames().get(expense.categoryId) ?? 'Unknown category';
  }

  /** What the expense comes to in the budget currency, at the latest rate. Empty when it is already in it. */
  protected conversion(expense: ExpenseResponse): string | null {
    const budgetCurrency = this.budget().currencyCode;
    if (!budgetCurrency || expense.currencyCode === budgetCurrency) {
      return null;
    }

    return expense.convertedAmount === null
      ? 'no exchange rate'
      : `≈ ${formatMoney(expense.convertedAmount, budgetCurrency)}`;
  }

  protected taskTitle(expense: ExpenseResponse): string | null {
    return expense.taskId ? (this.taskTitles().get(expense.taskId) ?? null) : null;
  }

  protected startAdd(): void {
    this.error.set(null);
    this.deletingId.set(null);
    this.draft.set({
      id: null,
      description: '',
      amount: '',
      currencyCode: this.budget().currencyCode ?? '',
      categoryId: this.budget().categories[0]?.id ?? '',
      paidOn: today(),
      taskId: '',
      notes: '',
    });
  }

  protected startEdit(expense: ExpenseResponse): void {
    this.error.set(null);
    this.deletingId.set(null);
    this.draft.set({
      id: expense.id,
      description: expense.description,
      amount: String(expense.amount),
      currencyCode: expense.currencyCode,
      categoryId: expense.categoryId,
      paidOn: expense.paidOn,
      taskId: expense.taskId ?? '',
      notes: expense.notes ?? '',
    });
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected update(field: DraftField, value: string): void {
    this.draft.update((draft) => (draft ? { ...draft, [field]: value } : draft));
  }

  protected async save(): Promise<void> {
    const draft = this.draft();
    if (!draft) {
      return;
    }

    const amount = parseAmount(draft.amount);
    const problem = problemWith(draft, amount);
    if (problem || amount === null) {
      this.error.set(problem);
      return;
    }

    const body = {
      categoryId: draft.categoryId,
      taskId: draft.taskId || null,
      description: draft.description.trim(),
      amount,
      currencyCode: draft.currencyCode,
      paidOn: draft.paidOn,
      notes: draft.notes.trim() || null,
    };

    this.saving.set(true);
    this.error.set(null);
    try {
      if (draft.id) {
        await this.api.updateExpense(this.relocationId(), draft.id, body);
      } else {
        await this.api.createExpense(this.relocationId(), body);
      }

      this.draft.set(null);
      this.expenses.reload();
      this.changed.emit();
    } catch (error) {
      this.error.set(failureMessage(error, 'The expense could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(expense: ExpenseResponse): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.deleteExpense(this.relocationId(), expense.id);
      this.deletingId.set(null);
      this.expenses.reload();
      this.changed.emit();
    } catch (error) {
      this.error.set(failureMessage(error, 'The expense could not be deleted.'));
    } finally {
      this.saving.set(false);
    }
  }
}

function problemWith(draft: ExpenseDraft, amount: number | null): string | null {
  const description = draft.description.trim();
  if (!description) {
    return 'Description is required.';
  }

  if (description.length > 200) {
    return 'Description must be 200 characters or fewer.';
  }

  if (amount === null) {
    return 'Enter an amount greater than zero.';
  }

  if (!draft.currencyCode) {
    return 'Choose a currency.';
  }

  if (!draft.categoryId) {
    return 'Choose a category.';
  }

  if (!draft.paidOn) {
    return 'Choose the date it was paid.';
  }

  if (draft.notes.trim().length > 1000) {
    return 'Notes must be 1000 characters or fewer.';
  }

  return null;
}

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
