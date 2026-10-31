import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  NotificationPreferenceResponse,
  NotificationResponse,
  SaveNotificationPreferenceRequest,
} from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { Session } from '../core/session';
import { daysBeforeMessage } from './labels';
import { NotificationsPage } from './notifications-page';

const relocationId = '0199f0a1-7c00-7000-8000-000000000010';

describe('NotificationsPage', () => {
  it('lists unread reminders and marks one read', async () => {
    let readId = '';
    const harness = await open({
      listNotifications: () =>
        Promise.resolve([
          reminder('Give notice', null),
          reminder('Move day', '2026-10-25T12:00:00.000Z', '0199f0a1-7c00-7000-8000-000000000042'),
        ]),
      markNotificationRead: (id: string) => {
        readId = id;
        return Promise.resolve(reminder('Give notice', '2026-10-25T13:00:00.000Z'));
      },
    });
    const root = harness.routeNativeElement!;

    expect(root.querySelector('[data-kind="TaskDue"]')?.textContent).toContain('Give notice');
    expect(root.querySelector('[data-kind="TaskDue"]')?.textContent).toContain('Wellington');
    expect(root.querySelector('[data-kind="Milestone"]')?.textContent).not.toContain('Mark read');

    clickButton(root, 'Mark read');
    await harness.fixture.whenStable();

    expect(readId).toBe('0199f0a1-7c00-7000-8000-000000000041');
  });

  it('marks every reminder read', async () => {
    let marked = false;
    const harness = await open({
      listNotifications: () => Promise.resolve([reminder('Give notice', null)]),
      markNotificationsRead: () => {
        marked = true;
        return Promise.resolve();
      },
    });

    clickButton(harness.routeNativeElement!, 'Mark all read');
    await harness.fixture.whenStable();

    expect(marked).toBe(true);
  });

  it('refuses a lead time past 90 days before calling the API', async () => {
    let saved = false;
    const harness = await open({
      updateNotificationPreference: () => {
        saved = true;
        return Promise.resolve(preference('InApp', 3));
      },
    });
    const root = harness.routeNativeElement!;

    setValue(root.querySelector('#reminder-days'), '91');
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(saved).toBe(false);
    expect(root.textContent).toContain(daysBeforeMessage);
  });

  it('saves the channel and the lead time', async () => {
    let saved: SaveNotificationPreferenceRequest | undefined;
    const harness = await open({
      updateNotificationPreference: (body: SaveNotificationPreferenceRequest) => {
        saved = body;
        return Promise.resolve(preference('Both', 2));
      },
    });
    const root = harness.routeNativeElement!;

    setValue(root.querySelector('#reminder-channel'), 'Both');
    setValue(root.querySelector('#reminder-days'), '2');
    root.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();

    expect(saved).toEqual({ channel: 'Both', daysBefore: 2 });
  });

  it('says when nothing is coming up', async () => {
    const harness = await open({
      listNotifications: () => Promise.resolve([]),
    });

    expect(harness.routeNativeElement?.textContent).toContain('Nothing is coming up.');
  });
});

async function open(client: Partial<ReloviaClient>): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'notifications', component: NotificationsPage }]),
      {
        provide: ReloviaClient,
        useValue: {
          getNotificationPreference: () => Promise.resolve(preference('InApp', 3)),
          listNotifications: () => Promise.resolve([reminder('Give notice', null)]),
          ...client,
        },
      },
    ],
  });
  TestBed.inject(Session).user.set({
    id: '0199f0a1-7c00-7000-8000-000000000001',
    email: 'owner@example.com',
    displayName: 'Owner',
    avatarUrl: null,
    preferredCurrency: 'USD',
    preferredLanguage: 'en',
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/notifications');
  await harness.fixture.whenStable();
  harness.detectChanges();
  return harness;
}

function preference(channel: NotificationPreferenceResponse['channel'], daysBefore: number) {
  return { channel, daysBefore };
}

function reminder(
  title: string,
  readAt: string | null,
  id = '0199f0a1-7c00-7000-8000-000000000041',
): NotificationResponse {
  return {
    id,
    relocationId,
    relocationName: 'Wellington',
    kind: title === 'Move day' ? 'Milestone' : 'TaskDue',
    title,
    occursOn: '2026-11-03',
    createdAt: '2026-10-25T12:00:00.000Z',
    readAt,
  };
}

function clickButton(root: HTMLElement, name: string): void {
  const button = [...root.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  button?.click();
}

function setValue(element: Element | null, value: string): void {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) {
    throw new Error('Missing field');
  }

  element.value = value;
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input'));
}
