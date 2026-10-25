import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  CalendarEventResponse,
  RelocationCalendarResponse,
  RelocationResponse,
  SaveCalendarEventRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { endBeforeStartMessage } from './schedule';
import { CalendarPage } from './calendar-page';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';
const taskId = '0199f0a1-7c00-7000-8000-000000000021';

describe('CalendarPage', () => {
  it('shows a milestone, an appointment, and a task due date as different things', async () => {
    const harness = await open({
      getCalendar: () => Promise.resolve(calendarOn(15)),
    });
    const root = harness.routeNativeElement!;
    const day = root.querySelector(`[data-date="${monthDate(15)}"]`);
    if (!(day instanceof HTMLButtonElement)) {
      throw new Error('Missing day');
    }

    expect(day.textContent).toContain('Move day');
    expect(day.textContent).toContain('Key handover');
    expect(day.textContent).not.toContain('Give notice');
    day.click();
    harness.detectChanges();
    const agenda = root.querySelector('#day-agenda');
    expect(agenda?.textContent).toContain('Give notice');

    expect(agenda?.querySelector('[data-kind="Milestone"]')?.textContent).toContain('Edit');
    expect(agenda?.querySelector('[data-kind="Appointment"]')?.textContent).toContain('Edit');
    expect(agenda?.querySelector('[data-kind="task"]')?.textContent).toContain('Open tasks');
    expect(agenda?.querySelector('[data-kind="task"]')?.textContent).not.toContain('Edit');
  });

  it('saves a milestone without a start time', async () => {
    let saved: SaveCalendarEventRequest | undefined;
    const harness = await open({
      createCalendarEvent: (_id: string, body: SaveCalendarEventRequest) => {
        saved = body;
        return Promise.resolve(milestone(body.occursOn ?? monthDate(15)));
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add event');
    harness.detectChanges();
    setValue(root.querySelector('#event-title'), 'Lease start');
    setValue(root.querySelector('#event-date'), monthDate(20));
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(saved).toEqual({
      title: 'Lease start',
      kind: 'Milestone',
      occursOn: monthDate(20),
      startsAt: null,
      endsAt: null,
      location: null,
    });
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('refuses an appointment whose end is not after the start', async () => {
    let saved = false;
    const harness = await open({
      createCalendarEvent: () => {
        saved = true;
        return Promise.resolve(milestone(monthDate(15)));
      },
    });
    const root = harness.routeNativeElement!;

    clickButton(root, 'Add event');
    harness.detectChanges();
    setSelect(root.querySelector('#event-kind'), 'Appointment');
    harness.detectChanges();
    setValue(root.querySelector('#event-title'), 'Key handover');
    setValue(root.querySelector('#event-start'), `${monthDate(15)}T15:00`);
    setValue(root.querySelector('#event-end'), `${monthDate(15)}T14:00`);
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    harness.detectChanges();

    expect(saved).toBe(false);
    expect(root.textContent).toContain(endBeforeStartMessage);
  });
});

async function open(overrides: Record<string, unknown>): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'relocations/:id/calendar', component: CalendarPage }]),
      {
        provide: ReloviaClient,
        useValue: {
          getRelocation: () => Promise.resolve(relocation()),
          getCalendar: () => Promise.resolve(emptyCalendar()),
          ...overrides,
        },
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/relocations/${relocationId}/calendar`);
  await harness.fixture.whenStable();
  harness.detectChanges();
  return harness;
}

function clickButton(root: HTMLElement, name: string): void {
  const button = [...root.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === name,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${name}`);
  }

  button.click();
}

function setValue(input: Element | null, value: string): void {
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Missing input');
  }

  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function setSelect(input: Element | null, value: string): void {
  if (!(input instanceof HTMLSelectElement)) {
    throw new Error('Missing select');
  }

  input.value = value;
  input.dispatchEvent(new Event('change'));
}

function monthDate(day: number): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function emptyCalendar(): RelocationCalendarResponse {
  return { events: [], taskDueDates: [] };
}

function calendarOn(day: number): RelocationCalendarResponse {
  const date = monthDate(day);
  const [year, month, dateDay] = date.split('-').map(Number);
  return {
    events: [
      milestone(date),
      {
        id: '0199f0a1-7c00-7000-8000-000000000032',
        title: 'Key handover',
        kind: 'Appointment',
        occursOn: null,
        startsAt: new Date(year, month - 1, dateDay, 9, 30).toISOString(),
        endsAt: new Date(year, month - 1, dateDay, 10, 0).toISOString(),
        location: "Landlord's office",
      },
    ],
    taskDueDates: [{ taskId, title: 'Give notice', dueDate: date }],
  };
}

function milestone(date: string): CalendarEventResponse {
  return {
    id: '0199f0a1-7c00-7000-8000-000000000031',
    title: 'Move day',
    kind: 'Milestone',
    occursOn: date,
    startsAt: null,
    endsAt: null,
    location: null,
  };
}

function relocation(): RelocationResponse {
  return {
    id: relocationId,
    name: 'Wellington move',
    originCountryCode: 'CL',
    originCity: 'Santiago',
    destinationCountryCode: 'NZ',
    destinationCity: 'Wellington',
    targetDate: '2026-12-01',
    purpose: 'Work',
    status: 'Active',
    isInternational: true,
    createdAt: '2026-10-12T12:00:00.000Z',
    updatedAt: '2026-10-12T12:00:00.000Z',
  };
}
