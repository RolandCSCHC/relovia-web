import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { apiOrigin, googleSignInUrl } from './core/api-origin';
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
    expect(compiled.querySelector('.wordmark')?.getAttribute('aria-label')).toBe('Relovia');
    expect(compiled.querySelector('.wordmark text')?.textContent).toContain('Relovia');
    expect(compiled.querySelector(`a[href="${googleSignInUrl}"]`)?.textContent).toContain(
      'Continue with Google',
    );
    expect(compiled.querySelector('[aria-label="Switch to dark theme"]')).not.toBeNull();
    expect(compiled.textContent).not.toContain('Sign out');
    expect(compiled.textContent).not.toContain('Notifications');
    TestBed.inject(HttpTestingController).expectNone(`${apiOrigin}/api/notifications`);
  });

  it('shows an unread count once someone is signed in', async () => {
    const loaded = firstValueFrom(TestBed.inject(Session).ensureLoaded());
    TestBed.inject(HttpTestingController).expectOne(`${apiOrigin}/api/auth/me`).flush({
      id: '0199f0a1-7c00-7000-8000-000000000001',
      email: 'owner@example.com',
      displayName: 'Ada',
      avatarUrl: null,
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
      hasAccess: true,
    });
    await loaded;

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    TestBed.inject(HttpTestingController)
      .expectOne(`${apiOrigin}/api/notifications`)
      .flush([
        {
          id: '0199f0a1-7c00-7000-8000-000000000041',
          relocationId: '0199f0a1-7c00-7000-8000-000000000010',
          relocationName: 'Wellington',
          kind: 'TaskDue',
          title: 'Give notice',
          occursOn: '2026-11-03',
          createdAt: '2026-10-25T12:00:00.000Z',
          readAt: null,
        },
        {
          id: '0199f0a1-7c00-7000-8000-000000000042',
          relocationId: '0199f0a1-7c00-7000-8000-000000000010',
          relocationName: 'Wellington',
          kind: 'Milestone',
          title: 'Move day',
          occursOn: '2026-11-03',
          createdAt: '2026-10-25T12:00:00.000Z',
          readAt: '2026-10-25T13:00:00.000Z',
        },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href="/notifications"]') as HTMLElement;
    expect(link.textContent).toContain('Notifications');
    expect(link.querySelector('.unread')?.textContent?.trim()).toBe('1');
    expect(link.getAttribute('aria-label')).toBe('Notifications, 1 unread');
  });
});
