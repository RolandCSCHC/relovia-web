import { computed, inject, Injectable, resource, signal } from '@angular/core';
import { ReloviaClient } from '../api/relovia-client';
import { Session } from '../core/session';

/** In-app reminders for the signed-in user. Stays idle until someone is signed in. */
@Injectable({ providedIn: 'root' })
export class NotificationInbox {
  private readonly api = inject(ReloviaClient);
  private readonly session = inject(Session);
  private readonly revision = signal(0);

  readonly reminders = resource({
    params: () => {
      const user = this.session.user();
      return user ? `${user.id}:${this.revision()}` : undefined;
    },
    loader: () => this.api.listNotifications(),
  });

  readonly unreadCount = computed(() => {
    if (!this.reminders.hasValue()) {
      return 0;
    }

    return this.reminders.value().filter((reminder) => reminder.readAt == null).length;
  });

  refresh(): void {
    this.revision.update((revision) => revision + 1);
  }
}
