import { Routes } from '@angular/router';
import { BudgetPage } from './budget/budget-page';
import { authGuard, guestGuard } from './core/auth.guard';
import { Home } from './home/home';
import { ChecklistReview } from './relocations/checklist-review';
import { RelocationEditor } from './relocations/relocation-editor';
import { RelocationPage } from './relocations/relocation-page';
import { SignIn } from './sign-in/sign-in';

export const routes: Routes = [
  { path: 'sign-in', canActivate: [guestGuard], component: SignIn },
  { path: '', canActivate: [authGuard], component: Home },
  { path: 'relocations/new', canActivate: [authGuard], component: RelocationEditor },
  { path: 'relocations/:id/edit', canActivate: [authGuard], component: RelocationEditor },
  { path: 'relocations/:id/checklist', canActivate: [authGuard], component: ChecklistReview },
  { path: 'relocations/:id/budget', canActivate: [authGuard], component: BudgetPage },
  { path: 'relocations/:id', canActivate: [authGuard], component: RelocationPage },
  { path: '**', redirectTo: '' },
];
