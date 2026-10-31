import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Session } from './session';

/** The app itself: sign in first. */
export const authGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  return session
    .ensureLoaded()
    .pipe(map((user) => (user ? true : router.createUrlTree(['/sign-in']))));
};

/** The sign-in page: only for people who are not signed in. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  return session.ensureLoaded().pipe(map((user) => (user ? router.createUrlTree(['/']) : true)));
};
