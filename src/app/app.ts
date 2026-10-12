import { Component, computed, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Session } from './core/session';
import { Theme } from './core/theme';

@Component({
  selector: 'app-root',
  imports: [MatButton, MatIcon, MatIconButton, RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  protected readonly session = inject(Session);
  protected readonly theme = inject(Theme);
  protected readonly themeIcon = computed(() =>
    this.theme.scheme() === 'dark' ? 'light_mode' : 'dark_mode',
  );
  protected readonly themeToggleLabel = computed(() =>
    this.theme.scheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
  );

  protected signOut(): void {
    this.session.signOut().subscribe(() => {
      void this.router.navigateByUrl('/sign-in');
    });
  }
}
