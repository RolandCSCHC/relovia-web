import { Component, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type {
  CalendarEventKind,
  CalendarEventResponse,
  SaveCalendarEventRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { failureMessage } from '../budget/api-failure';
import { formatDate } from '../relocations/dates';
import { labelFor } from '../relocations/labels';
import { RelocationTabs } from '../relocations/relocation-tabs';
import { eventKinds } from './labels';
import {
  appointmentDay,
  eventProblem,
  formatTimeRange,
  fromLocalInput,
  marksOn,
  monthDays,
  monthOf,
  monthTitle,
  type DayMark,
  type EventInput,
  shiftMonth,
  todayKey,
  toLocalInput,
  visibleMarks,
  weekdayLabels,
} from './schedule';

@Component({
  selector: 'app-calendar-page',
  imports: [MatButton, RelocationTabs, RouterLink],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
})
export class CalendarPage {
  private readonly api = inject(ReloviaClient);
  private readonly today = todayKey();

  protected readonly eventKinds = eventKinds;
  protected readonly weekdays = weekdayLabels;
  protected readonly formatDate = formatDate;
  protected readonly labelFor = labelFor;
  protected readonly visibleMarks = visibleMarks;
  protected readonly visible = signal(monthOf(this.today));
  protected readonly selected = signal(this.today);
  protected readonly adding = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly draft = signal<EventInput | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id') ?? undefined)),
  );

  protected readonly relocation = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getRelocation(params),
  });

  protected readonly calendar = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.getCalendar(params),
  });

  protected readonly heading = computed(() => {
    const month = this.visible();
    return monthTitle(month.year, month.month);
  });

  protected readonly days = computed(() => {
    const month = this.visible();
    return monthDays(month.year, month.month);
  });

  protected dayMarks(date: string): DayMark[] {
    if (!this.calendar.hasValue()) {
      return [];
    }

    const calendar = this.calendar.value();
    return marksOn(date, calendar.events, calendar.taskDueDates);
  }

  protected dayLabel(date: string): string {
    const count = this.dayMarks(date).length;
    const when = formatDate(date);
    if (count === 0) {
      return when;
    }

    return count === 1 ? `${when}, 1 item` : `${when}, ${count} items`;
  }

  protected isToday(date: string): boolean {
    return date === this.today;
  }

  protected dayNumber(date: string): number {
    return Number(date.slice(8));
  }

  protected eventsOn(date: string): CalendarEventResponse[] {
    if (!this.calendar.hasValue()) {
      return [];
    }

    return this.calendar.value().events.filter((event) => this.onDate(event, date));
  }

  protected tasksOn(date: string): { taskId: string; title: string }[] {
    if (!this.calendar.hasValue()) {
      return [];
    }

    return this.calendar.value().taskDueDates.filter((task) => task.dueDate === date);
  }

  protected timeLabel(event: CalendarEventResponse): string {
    return event.startsAt ? formatTimeRange(event.startsAt, event.endsAt) : '';
  }

  protected shift(delta: number): void {
    const next = shiftMonth(this.visible().year, this.visible().month, delta);
    this.visible.set(next);
    const selected = monthOf(this.selected());
    if (selected.year !== next.year || selected.month !== next.month) {
      this.selected.set(`${next.year}-${String(next.month).padStart(2, '0')}-01`);
    }
  }

  protected goToToday(): void {
    const today = todayKey();
    this.selected.set(today);
    this.visible.set(monthOf(today));
  }

  protected choose(date: string): void {
    this.selected.set(date);
    const next = monthOf(date);
    const current = this.visible();
    if (next.year !== current.year || next.month !== current.month) {
      this.visible.set(next);
    }
  }

  protected startAdd(): void {
    this.adding.set(true);
    this.editingId.set(null);
    this.deletingId.set(null);
    this.formError.set(null);
    this.draft.set(emptyDraft(this.selected()));
  }

  protected startEdit(event: CalendarEventResponse): void {
    this.adding.set(false);
    this.editingId.set(event.id);
    this.deletingId.set(null);
    this.formError.set(null);
    this.draft.set(draftFrom(event));
  }

  protected closeDialog(): void {
    if (this.saving()) {
      return;
    }

    this.adding.set(false);
    this.editingId.set(null);
    this.formError.set(null);
  }

  protected updateKind(value: string): void {
    this.draft.update((draft) => {
      if (!draft) {
        return draft;
      }

      const kind = value as CalendarEventKind;
      if (kind === 'Milestone' && !draft.occursOn && draft.startsAt) {
        return { ...draft, kind, occursOn: draft.startsAt.slice(0, 10) };
      }

      if (kind === 'Appointment' && !draft.startsAt && draft.occursOn) {
        return { ...draft, kind, startsAt: `${draft.occursOn}T09:00` };
      }

      return { ...draft, kind };
    });
  }

  protected updateDraft(
    key: 'title' | 'occursOn' | 'startsAt' | 'endsAt' | 'location',
    value: string,
  ): void {
    this.draft.update((draft) => (draft ? { ...draft, [key]: value } : draft));
  }

  protected async save(): Promise<void> {
    const relocationId = this.id();
    const draft = this.draft();
    if (!relocationId || !draft) {
      return;
    }

    const problem = eventProblem(draft);
    if (problem) {
      this.formError.set(problem);
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    try {
      const body = toRequest(draft);
      const editing = this.editingId();
      if (editing) {
        await this.api.updateCalendarEvent(relocationId, editing, body);
      } else {
        await this.api.createCalendarEvent(relocationId, body);
      }

      const savedDate =
        draft.kind === 'Milestone' ? draft.occursOn : appointmentDay(body.startsAt ?? null);
      this.adding.set(false);
      this.editingId.set(null);
      if (savedDate) {
        this.choose(savedDate);
      }

      this.calendar.reload();
    } catch (caught) {
      this.formError.set(failureMessage(caught, 'The event could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(event: CalendarEventResponse): Promise<void> {
    const relocationId = this.id();
    if (!relocationId) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.deleteCalendarEvent(relocationId, event.id);
      this.deletingId.set(null);
      this.calendar.reload();
    } catch (caught) {
      this.error.set(failureMessage(caught, 'The event could not be deleted.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private onDate(event: CalendarEventResponse, date: string): boolean {
    if (event.kind === 'Milestone') {
      return event.occursOn === date;
    }

    return appointmentDay(event.startsAt) === date;
  }
}

function emptyDraft(date: string): EventInput {
  return {
    kind: 'Milestone',
    title: '',
    occursOn: date,
    startsAt: `${date}T09:00`,
    endsAt: '',
    location: '',
  };
}

function draftFrom(event: CalendarEventResponse): EventInput {
  return {
    kind: event.kind,
    title: event.title,
    occursOn: event.occursOn ?? appointmentDay(event.startsAt) ?? '',
    startsAt: event.startsAt ? toLocalInput(event.startsAt) : '',
    endsAt: event.endsAt ? toLocalInput(event.endsAt) : '',
    location: event.location ?? '',
  };
}

function toRequest(draft: EventInput): SaveCalendarEventRequest {
  const location = draft.location.trim() || null;
  const title = draft.title.trim();
  if (draft.kind === 'Milestone') {
    return {
      title,
      kind: 'Milestone',
      occursOn: draft.occursOn,
      startsAt: null,
      endsAt: null,
      location,
    };
  }

  return {
    title,
    kind: 'Appointment',
    occursOn: null,
    startsAt: fromLocalInput(draft.startsAt),
    endsAt: draft.endsAt ? fromLocalInput(draft.endsAt) : null,
    location,
  };
}
