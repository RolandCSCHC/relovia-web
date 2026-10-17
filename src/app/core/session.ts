import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { apiOrigin } from './api-origin';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  preferredCurrency: string;
  preferredLanguage: string;
  /** False while the app is still closed and this account is not on the allow list. */
  hasAccess: boolean;
}

@Injectable({ providedIn: 'root' })
export class Session {
  private readonly http = inject(HttpClient);
  private pending: Observable<CurrentUser | null> | null = null;

  readonly user = signal<CurrentUser | null>(null);
  private readonly ready = signal(false);

  ensureLoaded(): Observable<CurrentUser | null> {
    if (this.ready()) {
      return of(this.user());
    }

    this.pending ??= this.http.get<CurrentUser>(`${apiOrigin}/api/auth/me`).pipe(
      map((user) => this.remember(user)),
      catchError(() => of(this.remember(null))),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.pending;
  }

  signOut(): Observable<void> {
    return this.http.post(`${apiOrigin}/api/auth/logout`, null, { responseType: 'text' }).pipe(
      tap(() => {
        this.pending = null;
        this.remember(null);
      }),
      map(() => undefined),
    );
  }

  private remember(user: CurrentUser | null): CurrentUser | null {
    this.user.set(user);
    this.ready.set(true);
    return user;
  }
}
