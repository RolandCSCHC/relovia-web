import { Routes } from '@angular/router';
import { BudgetPage } from './budget/budget-page';
import { CalendarPage } from './calendar/calendar-page';
import { authGuard, guestGuard, waitingGuard } from './core/auth.guard';
import { DocumentsPage } from './documents/documents-page';
import { HousingPage } from './housing/housing-page';
import { ApplicationsPage } from './applications/applications-page';
import { InventoryPage } from './inventory/inventory-page';
import { EarlyAccess } from './early-access/early-access';
import { Home } from './home/home';
import { SummaryPage } from './export/summary-page';
import { NotificationsPage } from './notifications/notifications-page';
import { ChecklistReview } from './relocations/checklist-review';
import { RelocationEditor } from './relocations/relocation-editor';
import { RelocationPage } from './relocations/relocation-page';
import { SignIn } from './sign-in/sign-in';

export const routes: Routes = [
  { path: 'sign-in', canActivate: [guestGuard], component: SignIn },
  { path: 'early-access', canActivate: [waitingGuard], component: EarlyAccess },
  { path: '', canActivate: [authGuard], component: Home },
  { path: 'notifications', canActivate: [authGuard], component: NotificationsPage },
  { path: 'relocations/new', canActivate: [authGuard], component: RelocationEditor },
  { path: 'relocations/:id/edit', canActivate: [authGuard], component: RelocationEditor },
  { path: 'relocations/:id/checklist', canActivate: [authGuard], component: ChecklistReview },
  { path: 'relocations/:id/budget', canActivate: [authGuard], component: BudgetPage },
  { path: 'relocations/:id/inventory', canActivate: [authGuard], component: InventoryPage },
  { path: 'relocations/:id/documents', canActivate: [authGuard], component: DocumentsPage },
  { path: 'relocations/:id/calendar', canActivate: [authGuard], component: CalendarPage },
  { path: 'relocations/:id/housing', canActivate: [authGuard], component: HousingPage },
  { path: 'relocations/:id/applications', canActivate: [authGuard], component: ApplicationsPage },
  { path: 'relocations/:id/summary', canActivate: [authGuard], component: SummaryPage },
  { path: 'relocations/:id', canActivate: [authGuard], component: RelocationPage },
  { path: '**', redirectTo: '' },
];
