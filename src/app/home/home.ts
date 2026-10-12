import { Component, inject } from '@angular/core';
import { Session } from '../core/session';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {
  protected readonly session = inject(Session);
}
