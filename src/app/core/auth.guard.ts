import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Session } from './session';

/** The app itself: sign in first, and be allowed in. */
export const authGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  return session.ensureLoaded().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/sign-in']);
      }

      return user.hasAccess ? true : router.createUrlTree(['/early-access']);
    }),
  );
};

/** The sign-in page: only for people who are not signed in. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  return session
    .ensureLoaded()
    .pipe(map((user) => (user ? router.createUrlTree([landingFor(user.hasAccess)]) : true)));
};

/** The "thanks for your interest" page: only for signed-in people without access. */
export const waitingGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  return session.ensureLoaded().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/sign-in']);
      }

      return user.hasAccess ? router.createUrlTree(['/']) : true;
    }),
  );
};

function landingFor(hasAccess: boolean): string {
  return hasAccess ? '/' : '/early-access';
}
