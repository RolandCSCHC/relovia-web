import { Component, inject } from '@angular/core';
import { Session } from '../core/session';

@Component({
  selector: 'app-early-access',
  templateUrl: './early-access.html',
  styleUrl: './early-access.scss',
})
export class EarlyAccess {
  protected readonly user = inject(Session).user;
}
