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
import { RelocationShell } from './relocations/relocation-shell';
import { SignIn } from './sign-in/sign-in';

export const routes: Routes = [
  { path: 'sign-in', canActivate: [guestGuard], component: SignIn },
  { path: 'early-access', canActivate: [waitingGuard], component: EarlyAccess },
  { path: '', canActivate: [authGuard], component: Home },
  { path: 'notifications', canActivate: [authGuard], component: NotificationsPage },
  { path: 'relocations/new', canActivate: [authGuard], component: RelocationEditor },
  { path: 'relocations/:id/edit', canActivate: [authGuard], component: RelocationEditor },
  { path: 'relocations/:id/checklist', canActivate: [authGuard], component: ChecklistReview },
  {
    path: 'relocations/:id',
    canActivate: [authGuard],
    component: RelocationShell,
    children: [
      { path: 'budget', component: BudgetPage },
      { path: 'inventory', component: InventoryPage },
      { path: 'documents', component: DocumentsPage },
      { path: 'calendar', component: CalendarPage },
      { path: 'housing', component: HousingPage },
      { path: 'applications', component: ApplicationsPage },
      { path: 'summary', component: SummaryPage },
      { path: '', component: RelocationPage },
    ],
  },
  { path: '**', redirectTo: '' },
];
