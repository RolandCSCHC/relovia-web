import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { Home } from './home/home';
import { SignIn } from './sign-in/sign-in';

export const routes: Routes = [
  { path: 'sign-in', canActivate: [guestGuard], component: SignIn },
  { path: '', canActivate: [authGuard], component: Home },
  { path: '**', redirectTo: '' },
];
