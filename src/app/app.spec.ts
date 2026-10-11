import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { apiOrigin } from './core/api-origin';
import { Session } from './core/session';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('shows the shell and the sign-in page when nobody is signed in', async () => {
    const loaded = firstValueFrom(TestBed.inject(Session).ensureLoaded());
    TestBed.inject(HttpTestingController)
      .expectOne(`${apiOrigin}/api/auth/me`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await loaded;

    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-toolbar')?.textContent).toContain('Relovia');
    expect(compiled.querySelector('a')?.textContent).toContain('Continue with Google');
    expect(compiled.querySelector('[aria-label="Switch to dark theme"]')).not.toBeNull();
    expect(compiled.textContent).not.toContain('Sign out');
  });
});
