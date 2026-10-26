import type {
  BudgetResponse,
  DocumentResponse,
  InventoryItemResponse,
  RelocationCalendarResponse,
  RelocationResponse,
  RelocationTaskResponse,
  RelocationTasksResponse,
  TaskProgressResponse,
} from '../api/generated';
import { formatMoney, toAmount } from '../budget/money';
import { appointmentDay, formatTimeRange } from '../calendar/schedule';
import { documentCategories } from '../documents/labels';
import { acquisitions, itemRooms, movingActions, packingStatuses } from '../inventory/labels';
import { countryName } from '../relocations/countries';
import { asCount, formatDate } from '../relocations/dates';
import { labelFor, phases, priorities, purposes, relocationStatuses } from '../relocations/labels';

export interface SummaryTask {
  title: string;
  meta: string;
  note: string;
}

export interface SummaryMoney {
  estimated: string;
  spent: string;
  remaining: string;
  over: boolean;
  categories: { name: string; remaining: string; over: boolean }[];
  ratesUnavailable: string | null;
  unconverted: string | null;
  rates: string | null;
}

export interface SummaryPacking {
  items: { title: string; meta: string }[];
  empty: string | null;
}

export interface SummaryDate {
  date: string;
  when: string;
  text: string;
}

export interface SummarySheet {
  id: string;
  name: string;
  route: string;
  details: string;
  progress: TaskProgressResponse;
  taskCount: number;
  openTasks: SummaryTask[];
  money: SummaryMoney | null;
  packing: SummaryPacking;
  dates: SummaryDate[];
}

export function buildSummary(input: {
  relocation: RelocationResponse;
  tasks: RelocationTasksResponse;
  budget: BudgetResponse;
  items: readonly InventoryItemResponse[];
  calendar: RelocationCalendarResponse;
  documents: readonly DocumentResponse[];
}): SummarySheet {
  const relocation = input.relocation;
  return {
    id: relocation.id,
    name: relocation.name,
    route: `${place(relocation, 'origin')} to ${place(relocation, 'destination')}`,
    details: details(relocation),
    progress: input.tasks.progress,
    taskCount: input.tasks.tasks.length,
    openTasks: [...input.tasks.tasks]
      .sort((left, right) => asCount(left.position) - asCount(right.position))
      .filter((task) => task.status === 'Todo' || task.status === 'InProgress')
      .map((task) => openTask(task, input.tasks.tasks)),
    money: money(input.budget),
    packing: packing(input.items),
    dates: dates(input.calendar, input.documents),
  };
}

function openTask(
  task: RelocationTaskResponse,
  tasks: readonly RelocationTaskResponse[],
): SummaryTask {
  return {
    title: task.title,
    meta: [
      labelFor(phases, task.phase),
      labelFor(priorities, task.priority),
      task.dueDate ? `Due ${formatDate(task.dueDate)}` : null,
    ]
      .filter((part) => part !== null)
      .join(' · '),
    note: dependencyNote(task, tasks),
  };
}

function dependencyNote(
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

function money(budget: BudgetResponse): SummaryMoney | null {
  const currency = budget.currencyCode;
  if (currency === null) {
    return null;
  }

  const unconverted = unconvertedNote(budget);
  return {
    estimated: formatMoney(budget.totals.estimated, currency),
    spent: formatMoney(budget.totals.actual, currency),
    remaining: remainingLabel(budget.totals.remaining, currency),
    over: toAmount(budget.totals.remaining) < 0,
    categories: budget.categories.map((category) => ({
      name: category.name,
      remaining: remainingLabel(category.remaining, currency),
      over: toAmount(category.remaining) < 0,
    })),
    ratesUnavailable: budget.ratesUnavailable
      ? 'Exchange rates could not be loaded right now, so amounts in other currencies are not counted.'
      : null,
    unconverted:
      unconverted.length > 0
        ? `Not counted, because there is no exchange rate to ${currency}: ${unconverted}.`
        : null,
    rates: budget.ratesAsOf
      ? `Amounts in other currencies use the rates of ${formatDate(budget.ratesAsOf.slice(0, 10))}.`
      : null,
  };
}

function remainingLabel(amount: number | string, currencyCode: string): string {
  return toAmount(amount) < 0
    ? `${formatMoney(-toAmount(amount), currencyCode)} over`
    : `${formatMoney(amount, currencyCode)} left`;
}

function unconvertedNote(budget: BudgetResponse): string {
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
        const amounts = [
          toAmount(row.shoppingEstimated) > 0
            ? `${formatMoney(row.shoppingEstimated, row.currencyCode)} estimated`
            : null,
          toAmount(row.shoppingSpent) > 0
            ? `${formatMoney(row.shoppingSpent, row.currencyCode)} spent`
            : null,
        ].filter((part) => part !== null);
        const itemWord = shopping === 1 ? 'item' : 'items';
        parts.push(`${amounts.join(' and ') || 'shopping'} (${shopping} ${itemWord} to buy)`);
      }

      return parts.join(' and ');
    })
    .filter((row) => row.length > 0)
    .join('; ');
}

function packing(items: readonly InventoryItemResponse[]): SummaryPacking {
  const bringing = items.filter((item) => item.movingAction === 'Bring');
  const waiting = bringing.filter((item) => item.packingStatus === 'NotPacked');
  if (bringing.length === 0) {
    return { items: [], empty: 'Nothing is marked to bring.' };
  }

  if (waiting.length === 0) {
    return { items: [], empty: 'Nothing left to pack.' };
  }

  return {
    empty: null,
    items: waiting.map((item) => {
      const quantity = asCount(item.quantity);
      return {
        title: quantity > 1 ? `${item.name} × ${quantity}` : item.name,
        meta: [
          item.room ? labelFor(itemRooms, item.room) : 'No room',
          labelFor(packingStatuses, 'NotPacked'),
          labelFor(acquisitions, item.acquisition),
          item.movingAction ? labelFor(movingActions, item.movingAction) : null,
        ]
          .filter((part) => part !== null)
          .join(' · '),
      };
    }),
  };
}

function dates(
  calendar: RelocationCalendarResponse,
  documents: readonly DocumentResponse[],
): SummaryDate[] {
  const rows: { date: string; text: string }[] = [];
  for (const event of calendar.events) {
    if (event.kind === 'Milestone' && event.occursOn) {
      rows.push({
        date: event.occursOn,
        text: [event.title, 'Milestone', event.location].filter((part) => part).join(' · '),
      });
    }

    if (event.kind === 'Appointment' && event.startsAt) {
      const day = appointmentDay(event.startsAt);
      if (day) {
        rows.push({
          date: day,
          text: [event.title, formatTimeRange(event.startsAt, event.endsAt), event.location]
            .filter((part) => part)
            .join(' · '),
        });
      }
    }
  }

  for (const document of documents) {
    if (!document.expiresOn) {
      continue;
    }

    const category = document.category ? labelFor(documentCategories, document.category) : null;
    rows.push({
      date: document.expiresOn,
      text: [document.fileName, 'expires', category].filter((part) => part !== null).join(' · '),
    });
  }

  return rows
    .sort(
      (left, right) => left.date.localeCompare(right.date) || left.text.localeCompare(right.text),
    )
    .map((row) => ({ date: row.date, when: formatDate(row.date), text: row.text }));
}

function place(relocation: RelocationResponse, end: 'origin' | 'destination'): string {
  const city = end === 'origin' ? relocation.originCity : relocation.destinationCity;
  const country =
    end === 'origin' ? relocation.originCountryCode : relocation.destinationCountryCode;
  return city.trim() ? `${city}, ${countryName(country)}` : countryName(country);
}

function details(relocation: RelocationResponse): string {
  return [
    relocation.targetDate ? formatDate(relocation.targetDate) : null,
    relocation.isInternational ? 'International' : 'Domestic',
    labelFor(purposes, relocation.purpose),
    labelFor(relocationStatuses, relocation.status),
  ]
    .filter((part) => part !== null)
    .join(' · ');
}
