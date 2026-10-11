import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Session } from './session';

export const authGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  return session
    .ensureLoaded()
    .pipe(map((user) => (user ? true : router.createUrlTree(['/sign-in']))));
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  return session.ensureLoaded().pipe(map((user) => (user ? router.createUrlTree(['/']) : true)));
};
