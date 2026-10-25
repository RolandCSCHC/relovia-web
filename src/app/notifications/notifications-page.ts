import { Component, inject, linkedSignal, resource, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import type { NotificationChannel } from '../api/generated';
import { ReloviaClient } from '../api/relovia-client';
import { failureMessage } from '../budget/api-failure';
import { formatDate } from '../relocations/dates';
import { NotificationInbox } from './inbox';
import { preferenceProblem, reminderChannels, reminderKindLabel } from './labels';

@Component({
  selector: 'app-notifications-page',
  imports: [MatButton, RouterLink],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.scss',
})
export class NotificationsPage {
  private readonly api = inject(ReloviaClient);
  protected readonly inbox = inject(NotificationInbox);
  protected readonly channels = reminderChannels;
  protected readonly formatDate = formatDate;
  protected readonly reminderKindLabel = reminderKindLabel;
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly marking = signal(false);

  protected readonly preference = resource({
    loader: () => this.api.getNotificationPreference(),
  });

  protected readonly draft = linkedSignal(() => {
    if (!this.preference.hasValue()) {
      return { channel: 'InApp' as NotificationChannel, daysBefore: 3 };
    }

    const value = this.preference.value();
    const daysBefore =
      typeof value.daysBefore === 'number' ? value.daysBefore : Number(value.daysBefore);
    return { channel: value.channel, daysBefore };
  });

  protected setChannel(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    const channel = select.value as NotificationChannel;
    this.draft.update((draft) => ({ ...draft, channel }));
  }

  protected setDays(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.draft.update((draft) => ({ ...draft, daysBefore: input.valueAsNumber }));
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const problem = preferenceProblem(this.draft().daysBefore);
    if (problem) {
      this.formError.set(problem);
      return;
    }

    this.formError.set(null);
    this.saving.set(true);
    try {
      await this.api.updateNotificationPreference(this.draft());
      this.preference.reload();
    } catch (error) {
      this.formError.set(failureMessage(error, 'Reminder settings could not be saved.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected async markRead(notificationId: string): Promise<void> {
    await this.mark(() => this.api.markNotificationRead(notificationId));
  }

  protected async markAll(): Promise<void> {
    await this.mark(() => this.api.markNotificationsRead());
  }

  private async mark(action: () => Promise<unknown>): Promise<void> {
    this.marking.set(true);
    this.formError.set(null);
    try {
      await action();
      this.inbox.refresh();
    } catch (error) {
      this.formError.set(failureMessage(error, 'The reminder could not be marked read.'));
    } finally {
      this.marking.set(false);
    }
  }
}
