import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { apiOrigin } from './api-origin';
import { authGuard, guestGuard } from './auth.guard';
import { CurrentUser } from './session';

describe('auth guards', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('sends an anonymous visitor to the sign-in page', async () => {
    const pending = activate(authGuard);
    http
      .expectOne(`${apiOrigin}/api/auth/me`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    const result = await pending;

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/sign-in');
  });

  it('allows a signed-in user through', async () => {
    const pending = activate(authGuard);
    http.expectOne(`${apiOrigin}/api/auth/me`).flush(user);
    const result = await pending;

    expect(result).toBe(true);
  });

  it('sends a signed-in user away from the sign-in page', async () => {
    const pending = activate(guestGuard);
    http.expectOne(`${apiOrigin}/api/auth/me`).flush(user);
    const result = await pending;

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });

  it('keeps the sign-in page for an anonymous visitor', async () => {
    const pending = activate(guestGuard);
    http
      .expectOne(`${apiOrigin}/api/auth/me`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    const result = await pending;

    expect(result).toBe(true);
  });
});

function activate(guard: typeof authGuard): Promise<unknown> {
  const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
}

const user: CurrentUser = {
  id: '0199c8e0-7b2a-7c3d-8e4f-1a2b3c4d5e6f',
  email: 'person@example.com',
  displayName: 'Person Example',
  avatarUrl: null,
  preferredCurrency: 'USD',
  preferredLanguage: 'en',
};
